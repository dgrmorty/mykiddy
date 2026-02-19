
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

export const askAiTutor = async (question: string, context: string): Promise<string> => {
  try {
    const response = await fetch(getApiUrl('api/ai-tutor'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, context })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error');
    }

    const data = await response.json();
    return data.text || "Не удалось получить ответ от сервера.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Не удалось связаться с сервером. Проверьте интернет соединение.";
  }
};

export const checkHomework = async (task: string, studentAnswer: string): Promise<string> => {
  try {
    const response = await fetch(getApiUrl('api/check-homework'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task, studentAnswer })
    });

    if (!response.ok) {
        return "Не удалось проверить задание. Попробуйте позже.";
    }

    const data = await response.json();
    return data.text || "Не удалось проанализировать ответ. Попробуйте еще раз.";
  } catch (error) {
    console.error("Homework Service Error:", error);
    return "Не удалось отправить задание. Проверьте интернет.";
  }
};
