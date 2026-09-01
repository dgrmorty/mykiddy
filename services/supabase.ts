import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY должны быть заданы в .env');
}

const SUPABASE_FETCH_TIMEOUT_MS = 8000;

/** Удаляем протухшую сессию до инициализации клиента — иначе refresh зависает и лента не грузится. */
export function purgeStaleLocalSession(): void {
  if (typeof localStorage === 'undefined') return;
  const now = Date.now();
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { expires_at?: number };
      const expiresAt = Number(parsed?.expires_at);
      if (!Number.isFinite(expiresAt) || expiresAt * 1000 < now - 5000) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  const ext = init?.signal;
  if (ext) {
    if (ext.aborted) controller.abort();
    else ext.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timer);
  });
}

if (typeof window !== 'undefined') {
  purgeStaleLocalSession();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/** Битый/просроченный JWT в localStorage → все REST-запросы (лента, логин) падают с 401. */
export function isCorruptAuthError(err: unknown): boolean {
  const msg = String(
    (err as { message?: string })?.message ||
      (err as { error_description?: string })?.error_description ||
      err ||
      '',
  ).toLowerCase();
  const code = String((err as { code?: string })?.code || '').toLowerCase();
  return (
    code === 'pgrst301' ||
    code === '401' ||
    msg.includes('jwt') ||
    msg.includes('no suitable key') ||
    msg.includes('refresh token') ||
    msg.includes('invalid claim') ||
    msg.includes('session from session_id claim') ||
    msg.includes('auth session missing')
  );
}

let clearingCorruptSession: Promise<void> | null = null;

type SupabaseResult<T> = { data: T | null; error: { message?: string; code?: string } | null };

/** Повтор запроса после сброса битого JWT в localStorage (PGRST301 / expired session). */
export async function withAuthRecovery<T>(
  run: () => Promise<SupabaseResult<T>>,
  label = 'supabase query',
): Promise<SupabaseResult<T>> {
  let result = await run();
  if (result.error && isCorruptAuthError(result.error)) {
    console.warn(`[Supabase] ${label}: corrupt session, retrying as anon`);
    await clearCorruptAuthSession(result.error.message);
    result = await run();
  }
  return result;
}

/** Сбрасывает локальную сессию, чтобы клиент снова ходил как anon. */
export async function clearCorruptAuthSession(reason?: string): Promise<void> {
  if (clearingCorruptSession) return clearingCorruptSession;
  clearingCorruptSession = (async () => {
    console.warn('[Supabase] Clearing corrupt auth session', reason || '');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('[Supabase] local signOut failed', e);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn('[Supabase] localStorage purge failed', e);
    }
  })().finally(() => {
    clearingCorruptSession = null;
  });
  return clearingCorruptSession;
}

/** В фоновых вкладках браузер троттлит таймеры — без этого сессия может «отвалиться», а UI — потерять данные профиля. */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const syncAuthRefresh = () => {
    try {
      if (document.visibilityState === 'visible') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    } catch {
      /* старые версии клиента */
    }
  };
  syncAuthRefresh();
  document.addEventListener('visibilitychange', syncAuthRefresh);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) syncAuthRefresh();
  });
}

// Функция для проверки подключения к Supabase
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch (e) {
    console.error('[Supabase] Connection check failed:', e);
    return false;
  }
};

export const signOut = async () => {
    await supabase.auth.signOut();
};

/**
 * Загружает файл в хранилище Supabase с автоматическим выбором бакета и обработкой ошибок.
 */
function guessStorageContentType(file: File, fileExt: string): string {
    if (file.type && file.type !== 'application/octet-stream') return file.type;
    const byExt: Record<string, string> = {
        pdf: 'application/pdf',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        zip: 'application/zip',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
    };
    return byExt[fileExt] || file.type || 'application/octet-stream';
}

export type UploadFileResult = { url: string | null; error?: string };

export const uploadFile = async (file: File, folder: string = 'avatars'): Promise<UploadFileResult> => {
    try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        let lastError = 'Не удалось загрузить файл';

        // Определяем приоритетный бакет на основе типа файла и папки
        let bucketPriority: string[] = [];
        
        if (folder === 'avatars') {
            bucketPriority = ['avatars', 'images'];
        } else if (folder === 'covers' || folder === 'cover') {
            bucketPriority = ['covers', 'images'];
        } else if (folder === 'videos' || folder === 'video') {
            bucketPriority = ['videos', 'images'];
        } else if (folder === 'lesson_materials') {
            bucketPriority = ['lesson_materials'];
        } else {
            bucketPriority = ['images', 'covers'];
        }
        
        console.log(`[Storage] Uploading file to folder: ${folder}, buckets to try:`, bucketPriority);
        
        for (const bucket of bucketPriority) {
            try {
                console.log(`[Storage] Trying upload to bucket: ${bucket}, file: ${fileName}`);
                
                // Проверяем размер файла (макс 10MB для изображений, 100MB для видео)
                const maxSize =
                    folder === 'videos' || folder === 'video'
                        ? 100 * 1024 * 1024
                        : folder === 'lesson_materials'
                          ? 50 * 1024 * 1024
                          : 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    console.error(`[Storage] File too large: ${file.size} bytes, max: ${maxSize}`);
                    return { url: null, error: 'Файл слишком большой' };
                }
                
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: guessStorageContentType(file, fileExt),
                    });

                if (!error && data) {
                    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
                    console.log(`[Storage] Upload success: ${urlData.publicUrl}`);
                    return { url: urlData.publicUrl };
                }
                
                // Если ошибка связана с отсутствием бакета, пробуем следующий
                if (error?.message?.includes('not found') || error?.message?.includes('Bucket')) {
                    console.warn(`[Storage] Bucket ${bucket} not found, trying next...`);
                    continue;
                }
                
                lastError = error?.message || lastError;
                console.warn(`[Storage] Bucket ${bucket} failed:`, error?.message);
            } catch (e: any) {
                lastError = e?.message || lastError;
                console.warn(`[Storage] Exception for bucket ${bucket}:`, e?.message);
                continue; // Пробуем следующий бакет
            }
        }

        console.error('[Storage] All buckets failed, upload unsuccessful');
        return { url: null, error: lastError };
    } catch (error: any) {
        console.error('[Storage] Critical crash:', error?.message || error);
        return { url: null, error: error?.message || 'Ошибка загрузки' };
    }
};
