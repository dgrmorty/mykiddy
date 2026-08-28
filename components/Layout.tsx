import React, { useState, useEffect } from 'react';
import { AppTopNav } from './AppTopNav';
import { User, Role } from '../types';
import { Outlet } from 'react-router-dom';
import { PageTransition } from './PageTransition';
import { NotificationProvider } from '../contexts/NotificationContext';
import { OnboardingTour } from './onboarding/OnboardingTour';
import { useProfileLastSeenHeartbeat } from '../hooks/useProfileLastSeenHeartbeat';
interface LayoutProps {
  user: User;
}

function LayoutShell({ user }: LayoutProps) {
  const isGuest = user.role === Role.GUEST;
  useProfileLastSeenHeartbeat(user.id, !isGuest && user.id !== 'guest');
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-transparent font-sans text-white selection:bg-white/30 selection:text-white">
      {isOffline && (
        <div className="fixed left-0 right-0 top-0 z-[100] bg-amber-500/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] text-center text-sm font-semibold text-black">
          Нет соединения с интернетом. Часть функций недоступна.
        </div>
      )}
      <AppTopNav currentUser={user} />

      <main className="relative z-10 flex min-h-0 w-full min-w-0 max-w-[100vw] flex-1 flex-col overflow-x-hidden px-3 pb-20 pt-20 sm:px-4 md:min-h-screen md:px-10 md:pb-12 md:pt-24 xl:px-16 2xl:px-20">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <OnboardingTour userId={user.id} isGuest={isGuest} role={user.role} />
    </div>
  );
}

export const Layout: React.FC<LayoutProps> = ({ user }) => {
  const isGuest = user.role === Role.GUEST;
  return (
    <NotificationProvider userId={isGuest ? null : user.id}>
      <LayoutShell user={user} />
    </NotificationProvider>
  );
};
