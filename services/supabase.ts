import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY должны быть заданы в .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
    msg.includes('jwt') ||
    msg.includes('refresh token') ||
    msg.includes('invalid claim') ||
    msg.includes('session from session_id claim') ||
    msg.includes('auth session missing')
  );
}

let clearingCorruptSession: Promise<void> | null = null;

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
export const uploadFile = async (file: File, folder: string = 'avatars'): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

        // Определяем приоритетный бакет на основе типа файла и папки
        let bucketPriority: string[] = [];
        
        if (folder === 'avatars') {
            bucketPriority = ['avatars', 'images'];
        } else if (folder === 'covers' || folder === 'cover') {
            bucketPriority = ['covers', 'images'];
        } else if (folder === 'videos' || folder === 'video') {
            bucketPriority = ['videos', 'images'];
        } else {
            bucketPriority = ['images', 'covers'];
        }
        
        console.log(`[Storage] Uploading file to folder: ${folder}, buckets to try:`, bucketPriority);
        
        for (const bucket of bucketPriority) {
            try {
                console.log(`[Storage] Trying upload to bucket: ${bucket}, file: ${fileName}`);
                
                // Проверяем размер файла (макс 10MB для изображений, 100MB для видео)
                const maxSize = folder === 'videos' || folder === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    console.error(`[Storage] File too large: ${file.size} bytes, max: ${maxSize}`);
                    return null;
                }
                
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type || (fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 
                                                   fileExt === 'png' ? 'image/png' : 
                                                   fileExt === 'gif' ? 'image/gif' : 
                                                   fileExt === 'webp' ? 'image/webp' : 
                                                   fileExt === 'mp4' ? 'video/mp4' : 'application/octet-stream')
                    });

                if (!error && data) {
                    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
                    console.log(`[Storage] Upload success: ${urlData.publicUrl}`);
                    return urlData.publicUrl;
                }
                
                // Если ошибка связана с отсутствием бакета, пробуем следующий
                if (error?.message?.includes('not found') || error?.message?.includes('Bucket')) {
                    console.warn(`[Storage] Bucket ${bucket} not found, trying next...`);
                    continue;
                }
                
                console.warn(`[Storage] Bucket ${bucket} failed:`, error?.message);
            } catch (e: any) {
                console.warn(`[Storage] Exception for bucket ${bucket}:`, e?.message);
                continue; // Пробуем следующий бакет
            }
        }

        console.error('[Storage] All buckets failed, upload unsuccessful');
        return null;
    } catch (error: any) {
        console.error('[Storage] Critical crash:', error?.message || error);
        return null;
    }
};
