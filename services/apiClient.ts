import { getApiUrl } from '../config';

export type ApiErrorCode = 'AUTH_REQUIRED' | 'AI_DAILY_LIMIT' | 'RATE_LIMIT' | 'AI_RATE_LIMIT' | 'SERVER_ERROR' | 'VALIDATION_ERROR' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'TIMEOUT';

export interface ApiError extends Error {
  code?: ApiErrorCode;
  status?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: object;
  token?: string | null;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Единый клиент для запросов к API: таймаут, заголовки, разбор ошибок с кодом.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = 30000, signal } = options;
  const url = getApiUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    const code = (data as { code?: ApiErrorCode }).code;
    const message = (data as { error?: string }).error || 'Ошибка запроса';

    if (!response.ok) {
      const err: ApiError = new Error(message) as ApiError;
      err.code = code;
      err.status = response.status;
      throw err;
    }

    return data as T;
  } catch (e: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        const err: ApiError = new Error('Сервер не успел ответить. Попробуйте ещё раз.') as ApiError;
        err.code = 'TIMEOUT';
        throw err;
      }
      throw e;
    }
    const err: ApiError = new Error('Нет связи с сервером. Проверьте интернет.') as ApiError;
    err.code = 'NETWORK_ERROR';
    throw err;
  }
}
