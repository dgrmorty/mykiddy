
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

const SERVER_DOWN_MSG = 'Сервер недоступен. Убедитесь, что приложение запущено на Railway, или попробуйте позже.';

function isNetworkOrServerError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase();
  return e?.name === 'AbortError' || msg.includes('fetch') || msg.includes('network') || msg === 'failed to fetch';
}

export const askAiTutor = async (question: string, context: string, accessToken?: string | null): Promise<string> => {
  try {
    return await askAiTutorOnce(question, context, accessToken);
  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (isNetworkOrServerError(error)) {
      try {
        return await askAiTutorOnce(question, context, accessToken);
      } catch (retryError: any) {
        if (retryError?.name === 'AbortError') {
          throw new Error("Сервер не успел ответить. Попробуйте ещё раз через минуту.");
        }
        throw new Error(isNetworkOrServerError(retryError) ? SERVER_DOWN_MSG : (retryError?.message || SERVER_DOWN_MSG));
      }
    }
    const msg = error?.message || '';
    if (msg.toLowerCase() === 'failed to fetch' || msg.includes('Load failed')) {
      throw new Error(SERVER_DOWN_MSG);
    }
    throw new Error(error?.message || "Не удалось связаться с сервером. Попробуйте позже.");
  }
};

const HOMEWORK_TIMEOUT_MS = 60000;

async function checkHomeworkOnce(task: string, studentAnswer: string, accessToken?: string | null): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HOMEWORK_TIMEOUT_MS);
  try {
    const response = await fetch(getApiUrl('api/check-homework'), {
      method: 'POST',
      headers: aiHeaders(accessToken),
      body: JSON.stringify({ task, studentAnswer }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error(errorData.error || "Лимит проверок на сегодня исчерпан. Попробуйте завтра.");
      if (response.status === 401) throw new Error(errorData.error || "Войдите в аккаунт.");
      throw new Error("Не удалось проверить задание. Попробуйте позже.");
    }
    const data = await response.json();
    return data.text || "Не удалось проанализировать ответ. Попробуйте еще раз.";
  } finally {
    clearTimeout(timeoutId);
  }
}

export const checkHomework = async (task: string, studentAnswer: string, accessToken?: string | null): Promise<string> => {
  try {
    return await checkHomeworkOnce(task, studentAnswer, accessToken);
  } catch (error: any) {
    if (isNetworkOrServerError(error)) {
      await new Promise((r) => setTimeout(r, 2500)); // пауза перед повтором
      try {
        return await checkHomeworkOnce(task, studentAnswer, accessToken);
      } catch (retryError: any) {
        if (retryError?.name === 'AbortError') throw new Error("Сервер не успел ответить (таймаут). Попробуйте ещё раз через минуту.");
        throw new Error(isNetworkOrServerError(retryError) ? SERVER_DOWN_MSG : (retryError?.message || "Не удалось отправить задание. Попробуйте позже."));
      }
    }
    if (error?.name === 'AbortError') throw new Error("Сервер не успел ответить (таймаут). Попробуйте ещё раз через минуту.");
    throw new Error(error?.message || "Не удалось отправить задание. Проверьте интернет или попробуйте позже.");
  }
};
