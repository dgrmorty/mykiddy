
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, signOut as supabaseSignOut } from '../services/supabase';
import { User, Role } from '../types';
import { GUEST_USER } from '../constants';
import { AuthModal } from '../components/AuthModal';

const ADMIN_EMAILS = ['knazar002@gmail.com'];

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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const loadingRef = React.useRef(true);
  const userRef = React.useRef<User>(user);
  userRef.current = user;

  const setAuthLoading = (val: boolean) => {
    setIsLoading(val);
    loadingRef.current = val;
  };

  const normalizeRole = (rawRole: string | undefined, email?: string): Role => {
    // Проверяем email только если он точно указан и совпадает
    if (email) {
      const emailLower = email.toLowerCase();
      if (ADMIN_EMAILS.includes(emailLower)) return Role.ADMIN;
    }
    // Проверяем роль из метаданных или профиля
    if (!rawRole) return Role.STUDENT;
    const r = rawRole.toLowerCase();
    if (r === 'admin') return Role.ADMIN;
    if (r === 'parent') return Role.PARENT;
    return Role.STUDENT;
  };

  const mapAuthToUser = useCallback((authUser: any): User => {
    const metadata = authUser.user_metadata || {};
    const email = authUser.email?.toLowerCase() || '';
    // Проверяем email только если он точно совпадает
    const isAdminEmail = email && ADMIN_EMAILS.includes(email);
    const role = normalizeRole(metadata.role, isAdminEmail ? email : undefined);
    
    return {
      id: authUser.id,
      email: authUser.email,
      name: metadata.name || authUser.email?.split('@')[0] || 'Ученик',
      role: role,
      avatar: metadata.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.name || 'User')}&background=random`,
      level: 1,
      xp: 0,
      isApproved: role === Role.ADMIN || metadata.is_approved === true
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

    try {
      console.log("[Auth] Fetching profile for:", userId);
      
      // Создаем запрос с таймаутом
      const profileRequest = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Гонка между запросом и таймаутом
      const result: any = await Promise.race([profileRequest, dbTimeout]);
      const { data: profile, error } = result;

      if (!error && profile) {
          const finalRole = normalizeRole(profile.role, profile.email || authUser?.email);
          // Убеждаемся, что уровень рассчитывается правильно на основе XP (100 XP = 1 уровень)
          const userXp = profile.xp || 0;
          const calculatedLevel = Math.floor(userXp / 100) + 1;
          const profileLevel = profile.level || calculatedLevel;
          
          setUser({
            id: userId,
            email: profile.email || authUser?.email,
            name: profile.name || authUser?.user_metadata?.name || 'Пользователь',
            role: finalRole,
            avatar: profile.avatar || authUser?.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=random`,
            level: Math.max(profileLevel, calculatedLevel), // Используем максимум из БД и рассчитанного
            xp: userXp,
            isApproved: finalRole === Role.ADMIN || profile.is_approved === true
          });
      } else {
          // Если профиль не найден или ошибка, используем данные из auth
          console.warn("[Auth] Profile not found or error, using auth data:", error?.message);
          if (authUser) {
            setUser(mapAuthToUser(authUser));
          }
      }
    } catch (e: any) {
      console.error("[Auth] Profile sync failed:", e);
      // При таймауте или другой ошибке используем данные из auth
      if (authUser) {
        console.log("[Auth] Falling back to auth user data");
        setUser(mapAuthToUser(authUser));
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
    
    // Глобальный таймер безопасности: если через 10 секунд мы все еще грузимся, принудительно пускаем пользователя как гостя
    const globalSafetyTimer = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn("[Auth] Global initialization timeout reached. Releasing UI...");
        setAuthLoading(false);
      }
    }, 10000);

    const initAuth = async () => {
      try {
        console.log("[Auth] Initializing session...");
        
        // Таймаут для получения сессии
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 5000)
        );
        
        const sessionRequest = supabase.auth.getSession();
        const result: any = await Promise.race([sessionRequest, sessionTimeout]);
        const { data: { session }, error } = result;
        
        if (error) {
          console.error("[Auth] Session error:", error);
          if (mounted) {
            setUser(GUEST_USER);
            setAuthLoading(false);
          }
          return;
        }
        
        if (session?.user && mounted) {
          // Сразу показываем приложение с данными из сессии — без ожидания профиля из БД.
          // Так при возврате из другого приложения (в т.ч. после перезагрузки вкладки) не будет экрана загрузки.
          setUser(mapAuthToUser(session.user));
          setAuthLoading(false);
          fetchProfile(session.user.id, session.user, { silent: true }).catch(() => {});
        } else if (mounted) {
          console.log("[Auth] No session found.");
          setUser(GUEST_USER);
          setAuthLoading(false);
        }
      } catch (err: any) {
        console.error("[Auth] Init Error:", err?.message || err);
        if (mounted) {
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
          setUser(mapAuthToUser(session.user));
          setAuthLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("[Auth] User signed out");
        setUser(GUEST_USER);
        setAuthLoading(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
        console.log("[Auth] No initial session");
        setUser(GUEST_USER);
        setAuthLoading(false);
      } else if (mounted) {
        setAuthLoading(false);
      }
    });

    // При возврате на вкладку — тихо подтягиваем свежий профиль (уровень, XP и т.д.) без экрана загрузки
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !mounted) return;
      const uid = userRef.current?.id;
      if (!uid) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted || !session?.user || session.user.id !== uid) return;
        fetchProfile(session.user.id, session.user, { silent: true }).catch(() => {});
      });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearTimeout(globalSafetyTimer);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
