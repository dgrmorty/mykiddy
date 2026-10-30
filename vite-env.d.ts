/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Публичный URL сайта (без слэша в конце). Для редиректа с *.railway.app и OAuth. */
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  /** Номер счётчика Яндекс Метрики. Без него аналитика не грузится. */
  readonly VITE_YM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
