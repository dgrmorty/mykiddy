
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, signOut as supabaseSignOut } from '../services/supabase';
import { User, Role } from '../types';
import { GUEST_USER } from '../constants';
import { bundledAvatarCanonical, defaultAvatarUrlForUserId, isBundledSchoolAvatar } from '../data/defaultAvatars';
import { levelFromXp } from '../progression';
import { AuthModal } from '../components/AuthModal';

// Список админов: в .env обязательно задать VITE_ADMIN_EMAILS=email1@example.com,email2@example.com
// В продакшене без этой переменной админов не будет.
const _adminFromEnv = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_EMAILS = _adminFromEnv;

/** Возврат с OAuth: токены/code в URL разбираются асинхронно — нельзя сразу считать сессию пустой. */
function isLikelyOAuthReturn(): boolean {
  if (typeof window === 'undefined') return false;
  const { search, hash } = window.location;
  const blob = `${search}&${hash}`;
  return (
    blob.includes('code=') ||
    blob.includes('access_token') ||
    blob.includes('refresh_token') ||
    blob.includes('provider_token')
  );
}

/** Сохраняем аватар из ответа БД; штатные ИИ — пути `/avatars/student-*.png`. */
function mergePreserveAvatar(prev: User, next: User): User {
  if (prev.id !== next.id || prev.role === Role.GUEST) return next;
  const nextA = (next.avatar || '').trim();
  if (isBundledSchoolAvatar(nextA)) return next;
  const prevA = (prev.avatar || '').trim();
  if (prevA && !nextA) return { ...next, avatar: prevA };
  return next;
}

interface AuthContextType {
  user: User;
  isLoading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  requireAuth: (callback?: () => void) => void;
  openAuthModal: () => void;
  signOut: () => Promise<void>;
  switchRole: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(GUEST_USER);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const loadingRef = React.useRef(false);
  const userRef = React.useRef<User>(user);
  const lastProfileRefreshRef = React.useRef(0);
  /** Сбрасываем устаревшие ответы fetchProfile (гонка USER_UPDATED / параллельные запросы). */
  const profileFetchSerialRef = React.useRef(0);
  /**
   * После OAuth Supabase может уже убрать code из URL, а INITIAL_SESSION ещё придёт с session=null —
   * без этого флага мы ошибочно выставляем гостя до завершения обмена кода.
   */
  const oauthRecoveryActiveRef = React.useRef(false);
  const oauthRecoveryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  userRef.current = user;

  const setAuthLoading = (val: boolean) => {
    setIsLoading(val);
    loadingRef.current = val;
  };

  const normalizeRole = (rawRole: string | undefined, email?: string): Role => {
    if (email) {
      const emailLower = email.toLowerCase();
      if (ADMIN_EMAILS.includes(emailLower)) return Role.ADMIN;
    }
    if (!rawRole) return Role.STUDENT;
    const r = rawRole.toLowerCase();
    if (r === 'admin') return Role.ADMIN;
    if (r === 'teacher') return Role.TEACHER;
    if (r === 'parent') return Role.PARENT;
    return Role.STUDENT;
  };

  const mapAuthToUser = useCallback((authUser: any): User => {
    const metadata = authUser.user_metadata || {};
    const email = authUser.email?.toLowerCase() || '';
    // Проверяем email только если он точно совпадает
    const isAdminEmail = email && ADMIN_EMAILS.includes(email);
    const role = normalizeRole(metadata.role, isAdminEmail ? email : undefined);
    
    const metaAvatar = bundledAvatarCanonical(metadata.avatar as string | undefined);
    return {
      id: authUser.id,
      email: authUser.email,
      name: metadata.name || authUser.email?.split('@')[0] || 'Ученик',
      role: role,
      avatar: metaAvatar ?? defaultAvatarUrlForUserId(authUser.id),
      level: 1,
      xp: 0,
      isApproved: true,
      streakCurrent: 0,
      streakLongest: 0,
    };
  }, []);

  const fetchProfile = async (userId: string, authUser?: any, options?: { silent?: boolean }) => {
    // Никогда не показываем глобальную загрузку при обновлении профиля того же пользователя
    // (возврат на вкладку, обновление токена и т.д.) — только при первом входе.
    const isSameUser = userRef.current?.id && userRef.current.id === userId;
    if (!options?.silent && !isSameUser) setAuthLoading(true);
    
    // Таймаут для запроса к базе данных
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DATABASE_TIMEOUT')), 3000)
    );

    // Таймер безопасности для UI
    const safetyTimer = setTimeout(() => {
        if (loadingRef.current) {
            console.warn("[Auth] Fetch profile timed out, releasing UI...");
            setAuthLoading(false);
        }
    }, 5000);

    const fetchSerial = ++profileFetchSerialRef.current;

    try {
      console.log("[Auth] Fetching profile for:", userId);
      
      // Создаем запрос с таймаутом
      const profileRequest = supabase
        .from('profiles')
        .select(
          'id, email, name, role, avatar, level, xp, is_approved, created_at, updated_at, streak_current, streak_longest, streak_last_activity_date, avatar_accessory',
        )
        .eq('id', userId)
        .single();

      // Гонка между запросом и таймаутом
      const result: any = await Promise.race([profileRequest, dbTimeout]);
      const { data: profile, error } = result;

      if (!error && profile) {
          const finalRole = normalizeRole(profile.role, profile.email || authUser?.email);
          const userXp = profile.xp || 0;
          const calculatedLevel = levelFromXp(userXp);
          const rawAvatar = profile.avatar as string | null | undefined;
          const resolvedAvatar =
            bundledAvatarCanonical(rawAvatar) ?? defaultAvatarUrlForUserId(userId);

          setUser((prev) => {
            if (fetchSerial !== profileFetchSerialRef.current) return prev;
            return mergePreserveAvatar(prev, {
              id: userId,
              email: profile.email || authUser?.email,
              name:
                (typeof profile.name === 'string' && profile.name.trim() !== ''
                  ? profile.name.trim()
                  : authUser?.user_metadata?.name) || 'Пользователь',
              role: finalRole,
              avatar: resolvedAvatar,
              level: calculatedLevel,
              xp: userXp,
              isApproved: true,
              streakCurrent: profile.streak_current ?? 0,
              streakLongest: profile.streak_longest ?? 0,
            });
          });
          // Не блокируем finally: при зависании RPC UI навсегда оставался бы на глобальном лоадере.
          void (async () => {
            try {
              const { data: sess } = await supabase.auth.getSession();
              if (!sess?.session) {
                console.warn('[Auth] record_daily_streak skipped: no active session');
                return;
              }
              const { data: sd, error: streakRpcError } = await supabase.rpc('record_daily_streak');
              if (streakRpcError) {
                console.warn('[Auth] record_daily_streak RPC error', streakRpcError.message, streakRpcError.code);
                return;
              }
              const d = sd as {
                ok?: boolean;
                error?: string;
                streak_current?: number;
                streak_longest?: number;
              } | null;
              if (d?.ok === false) {
                console.warn('[Auth] record_daily_streak returned ok:false', d?.error ?? d);
              } else if (d?.ok && typeof d.streak_current === 'number') {
                setUser((prev) => {
                  if (fetchSerial !== profileFetchSerialRef.current) return prev;
                  if (prev.id !== userId) return prev;
                  return {
                    ...prev,
                    streakCurrent: d.streak_current!,
                    streakLongest:
                      typeof d.streak_longest === 'number' ? d.streak_longest : prev.streakLongest ?? 0,
                  };
                });
              }
            } catch (e) {
              console.warn('[Auth] record_daily_streak exception', e);
            }
          })();
      } else {
          // Если профиль не найден или ошибка, используем данные из auth
          console.warn("[Auth] Profile not found or error, using auth data:", error?.message);
          if (authUser) {
            setUser((prev) => {
              if (fetchSerial !== profileFetchSerialRef.current) return prev;
              return mergePreserveAvatar(prev, mapAuthToUser(authUser));
            });
          }
      }
    } catch (e: any) {
      console.error("[Auth] Profile sync failed:", e);
      // При таймауте или другой ошибке используем данные из auth
      if (authUser) {
        console.log("[Auth] Falling back to auth user data");
        setUser((prev) => {
          if (fetchSerial !== profileFetchSerialRef.current) return prev;
          return mergePreserveAvatar(prev, mapAuthToUser(authUser));
        });
      } else {
        // Если нет authUser, устанавливаем гостя
        setUser(GUEST_USER);
      }
    } finally {
      clearTimeout(safetyTimer);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const endOAuthRecoveryWindow = () => {
      oauthRecoveryActiveRef.current = false;
      if (oauthRecoveryTimerRef.current) {
        clearTimeout(oauthRecoveryTimerRef.current);
        oauthRecoveryTimerRef.current = null;
      }
    };

    if (isLikelyOAuthReturn()) {
      oauthRecoveryActiveRef.current = true;
      oauthRecoveryTimerRef.current = setTimeout(() => {
        oauthRecoveryActiveRef.current = false;
        oauthRecoveryTimerRef.current = null;
      }, 45000);
    }
    
    // После OAuth редиректа разбор URL может занять сотни мс — даём до 25 с на инициализацию
    const globalSafetyMs = isLikelyOAuthReturn() ? 25000 : 12000;
    const globalSafetyTimer = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn("[Auth] Global initialization timeout reached. Releasing UI...");
        setAuthLoading(false);
      }
    }, globalSafetyMs);

    const initAuth = async () => {
      try {
        console.log("[Auth] Initializing session...", { oauthReturn: isLikelyOAuthReturn() });

        const oauthReturn = isLikelyOAuthReturn();
        const pollUntil = Date.now() + (oauthReturn ? 20000 : 0);
        const pollIntervalMs = 150;

        let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null;
        let error: Awaited<ReturnType<typeof supabase.auth.getSession>>['error'] = null;

        while (true) {
          const result = await supabase.auth.getSession();
          error = result.error;
          session = result.data.session;
          if (error) break;
          if (session?.user) break;
          if (!oauthReturn || Date.now() >= pollUntil) break;
          await new Promise((r) => setTimeout(r, pollIntervalMs));
        }

        if (error) {
          console.error("[Auth] Session error:", error);
          if (mounted) {
            endOAuthRecoveryWindow();
            setUser(GUEST_USER);
            setAuthLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          endOAuthRecoveryWindow();
          setUser((prev) => mergePreserveAvatar(prev, mapAuthToUser(session.user)));
          setAuthLoading(false);
          fetchProfile(session.user.id, session.user, { silent: true }).catch(() => {});
        } else if (mounted) {
          console.log("[Auth] No session found after init.");
          endOAuthRecoveryWindow();
          setUser(GUEST_USER);
          setAuthLoading(false);
        }
      } catch (err: any) {
        console.error("[Auth] Init Error:", err?.message || err);
        if (mounted) {
          endOAuthRecoveryWindow();
          setUser(GUEST_USER);
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Event: ${event}, Session:`, session ? 'exists' : 'null');
      
      if (!mounted) return;
      
      // При возврате в приложение (TOKEN_REFRESHED) не показываем глобальную загрузку — пользователь не теряет место в уроке
      const currentUser = userRef.current;
      const isSilentRefresh = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
      const alreadySameUser = session?.user && currentUser.id && currentUser.id === session.user.id;
      const silent = isSilentRefresh && !!alreadySameUser;
      
      if (session?.user) {
        endOAuthRecoveryWindow();
        if (silent) {
          console.log("[Auth] Silent profile refresh (return to app)");
        } else {
          console.log("[Auth] User authenticated, fetching profile...");
        }
        try {
          await fetchProfile(session.user.id, session.user, silent ? { silent: true } : undefined);
        } catch (err) {
          console.error("[Auth] Error in onAuthStateChange:", err);
          // Даже при ошибке устанавливаем пользователя из сессии
          setUser((prev) => mergePreserveAvatar(prev, mapAuthToUser(session.user)));
          setAuthLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        endOAuthRecoveryWindow();
        console.log("[Auth] User signed out");
        setUser(GUEST_USER);
        setAuthLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        const skipGuestWhileOAuth =
          oauthRecoveryActiveRef.current || isLikelyOAuthReturn();
        if (skipGuestWhileOAuth) {
          console.log(
            '[Auth] INITIAL_SESSION empty during OAuth recovery — skip forcing guest',
          );
          setAuthLoading(false);
          return;
        }
        void (async () => {
          await Promise.resolve();
          const {
            data: { session: lateSession },
            error: recErr,
          } = await supabase.auth.getSession();
          if (!mounted) return;
          if (recErr) {
            console.warn('[Auth] getSession after INITIAL_SESSION null:', recErr.message);
          }
          if (lateSession?.user) {
            console.log('[Auth] Session present after INITIAL_SESSION null — syncing profile');
            try {
              await fetchProfile(lateSession.user.id, lateSession.user, {
                silent: true,
              });
            } catch (err) {
              console.error('[Auth] Error after late session:', err);
              setUser((prev) => mergePreserveAvatar(prev, mapAuthToUser(lateSession.user)));
              setAuthLoading(false);
            }
            return;
          }
          console.log('[Auth] No initial session (confirmed)');
          setUser(GUEST_USER);
          setAuthLoading(false);
        })();
      } else if (mounted) {
        setAuthLoading(false);
      }
    });

    // Возврат на вкладку / bfcache: обновить сессию и профиль (троттлинг умеренный)
    const PROFILE_REFRESH_THROTTLE_MS = 15 * 1000;
    const refreshIfLoggedIn = () => {
      const uid = userRef.current?.id;
      if (!uid || userRef.current.role === Role.GUEST) return;
      if (Date.now() - lastProfileRefreshRef.current < PROFILE_REFRESH_THROTTLE_MS) return;
      lastProfileRefreshRef.current = Date.now();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted || !session?.user || session.user.id !== uid) return;
        fetchProfile(session.user.id, session.user, { silent: true }).then(() => {}).catch(() => {});
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !mounted) return;
      refreshIfLoggedIn();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (!mounted || !e.persisted) return;
      lastProfileRefreshRef.current = 0;
      refreshIfLoggedIn();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow as EventListener);

    return () => {
      mounted = false;
      endOAuthRecoveryWindow();
      clearTimeout(globalSafetyTimer);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow as EventListener);
    };
  }, [mapAuthToUser]);

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        return await fetchProfile(session.user.id, session.user);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
        await supabaseSignOut();
        setUser(GUEST_USER);
        // Очищаем состояние после выхода
        setTimeout(() => {
            setAuthLoading(false);
        }, 100);
    } catch (e) {
        console.error("Sign out error", e);
        setAuthLoading(false);
    }
  };

  const switchRole = () => {
    if (user.role === Role.GUEST || user.role === Role.ADMIN) return;
    setUser(prev => ({ ...prev, role: prev.role === Role.STUDENT ? Role.PARENT : Role.STUDENT }));
  };

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, isGuest: user.role === Role.GUEST, isAdmin: user.role === Role.ADMIN,
      requireAuth: (cb) => user.role === Role.GUEST ? setIsAuthModalOpen(true) : cb?.(),
      openAuthModal: () => setIsAuthModalOpen(true),
      signOut, switchRole, refreshUser
    }}>
      {children}
      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} onSuccess={() => setIsAuthModalOpen(false)} />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
