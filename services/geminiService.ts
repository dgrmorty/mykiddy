
import { getApiUrl } from '../config';

export const checkSystemHealth = async (): Promise<{ status: string; ai_active: boolean }> => {
  try {
    const response = await fetch(getApiUrl('api/health'));
    if (!response.ok) throw new Error('Network error');
    return await response.json();
  } catch (e) {
    console.error("Health check failed:", e);
    return { status: 'offline', ai_active: false };
  }
};

/** Квота ИИ на сегодня (для отображения в UI). Без токена возвращает дефолтные лимиты. */
export const getAiUsageQuota = async (accessToken?: string | null): Promise<{ tutor_remaining: number; homework_remaining: number }> => {
  try {
    const response = await fetch(getApiUrl('api/ai-usage'), {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    });
    if (!response.ok) return { tutor_remaining: 25, homework_remaining: 15 };
    const data = await response.json();
    return {
      tutor_remaining: data.tutor_remaining ?? 25,
      homework_remaining: data.homework_remaining ?? 15
    };
  } catch (e) {
    console.error("AI quota fetch failed:", e);
    return { tutor_remaining: 25, homework_remaining: 15 };
  }
};

const AI_TUTOR_TIMEOUT_MS = 90000; // 90 сек — генерация ответа ИИ может долго идти, особенно при холодном старте сервера

function aiHeaders(accessToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
  return h;
}

async function askAiTutorOnce(question: string, context: string, accessToken?: string | null): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TUTOR_TIMEOUT_MS);

  const response = await fetch(getApiUrl('api/ai-tutor'), {
    method: 'POST',
    headers: aiHeaders(accessToken),
    body: JSON.stringify({ question, context }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error(errorData.error || 'Лимит запросов на сегодня исчерпан. Попробуйте завтра.');
    }
    if (response.status === 401) {
      throw new Error(errorData.error || 'Войдите в аккаунт.');
    }
    throw new Error(errorData.error || 'Сервер временно недоступен. Попробуйте позже.');
  }

  const data = await response.json();
  return data.text || "Не удалось получить ответ от сервера.";
}

export const askAiTutor = async (question: string, context: string, accessToken?: string | null): Promise<string> => {
  try {
    return await askAiTutorOnce(question, context, accessToken);
  } catch (error: any) {
    console.error("AI Service Error:", error);
    // Одна повторная попытка при сетевой ошибке или таймауте (часто помогает на мобильном интернете)
    if (error?.name === 'AbortError' || error?.message?.includes('fetch') || error?.message?.includes('Network')) {
      try {
        return await askAiTutorOnce(question, context, accessToken);
      } catch (retryError: any) {
        if (retryError?.name === 'AbortError') {
          throw new Error("Сервер не успел ответить. Попробуйте ещё раз через минуту.");
        }
        throw new Error(retryError?.message || "Не удалось связаться с сервером. Попробуйте позже или проверьте соединение.");
      }
    }
    throw new Error(error?.message || "Не удалось связаться с сервером. Попробуйте позже.");
  }
};

const HOMEWORK_TIMEOUT_MS = 60000; // 60 сек — проверка ДЗ через ИИ может занимать время

export const checkHomework = async (task: string, studentAnswer: string, accessToken?: string | null): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HOMEWORK_TIMEOUT_MS);

    const response = await fetch(getApiUrl('api/check-homework'), {
        method: 'POST',
        headers: aiHeaders(accessToken),
        body: JSON.stringify({ task, studentAnswer }),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
            throw new Error(errorData.error || "Лимит проверок на сегодня исчерпан. Попробуйте завтра.");
        }
        if (response.status === 401) {
            throw new Error(errorData.error || "Войдите в аккаунт.");
        }
        throw new Error("Не удалось проверить задание. Попробуйте позже.");
    }

    const data = await response.json();
    const text = data.text || "Не удалось проанализировать ответ. Попробуйте еще раз.";
    return text;
  } catch (error: any) {
    console.error("Homework Service Error:", error);
    if (error?.name === 'AbortError') {
        throw new Error("Сервер не успел ответить (таймаут). Попробуйте ещё раз через минуту.");
    }
    // Бросаем ошибку, чтобы в CourseDetail не начислялись XP при сбое отправки
    throw new Error(error?.message || "Не удалось отправить задание. Проверьте интернет или попробуйте позже.");
  }
};
