
// ВАЖНО: Замените эту строку на ваш реальный URL из Railway
// Например: 'https://kiddy-os-production.up.railway.app'
// Не забудьте убрать слеш в конце!

export const API_BASE_URL = 'https://mykiddy-production.up.railway.app';

// Вспомогательная функция для построения путей
export const getApiUrl = (endpoint: string) => {
    // Удаляем начальный слеш у эндпоинта, если он есть, чтобы избежать двойных слешей
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
};
