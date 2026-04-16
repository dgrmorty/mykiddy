
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { CourseDetail } from './views/CourseDetail';
import { Profile } from './views/Profile';
import { Schedule } from './views/Schedule';
import { AdminPanel } from './views/AdminPanel';
import { Settings } from './views/Settings';
import { Community } from './views/Community';
import { UserPublicProfile } from './views/UserPublicProfile';
import { Notifications } from './views/Notifications';
import { AuthConfirmed } from './views/AuthConfirmed';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { ToastProvider } from './contexts/ToastContext';
import { ContentProvider } from './contexts/ContentContext';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isGuest, isLoading } = useAuth();
    if (isLoading) return null;
    if (isGuest) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isGuest, isLoading } = useAuth();
    if (isLoading) return null;
    if (isGuest || user.role !== Role.ADMIN) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-5 px-6"
        style={{ background: '#050505' }}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-kiddy-cherry/20 blur-2xl animate-glow-pulse" />
          <div
            className="relative animate-spin rounded-full border-2 border-white/10 border-t-[#e6002b]"
            style={{ width: 44, height: 44 }}
          />
        </div>
        <p className="animate-fade-in text-center text-sm font-medium text-kiddy-textSecondary" style={{ animationDelay: '0.2s' }}>
          Дети В ТОПЕ
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={<Dashboard user={user} />} />

          {/* Возврат по ссылке подтверждения email */}
          <Route path="auth/confirmed" element={<AuthConfirmed />} />
          
          <Route path="courses" element={
            <ProtectedRoute>
                <CourseDetail />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute>
                <Profile user={user} />
            </ProtectedRoute>
          } />

          <Route path="settings" element={
            <ProtectedRoute>
                <Settings />
            </ProtectedRoute>
          } />

          <Route path="notifications" element={
            <ProtectedRoute>
                <Notifications />
            </ProtectedRoute>
          } />
          
          <Route path="schedule" element={
            <ProtectedRoute>
                <Schedule />
            </ProtectedRoute>
          } />

          <Route path="community" element={
            <ProtectedRoute>
                <Community />
            </ProtectedRoute>
          } />

          <Route path="users/:userId" element={
            <ProtectedRoute>
                <UserPublicProfile />
            </ProtectedRoute>
          } />

          <Route path="admin" element={
            <StaffRoute>
                <AdminPanel />
            </StaffRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <BrandingProvider>
      <AuthProvider>
        <ContentProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ContentProvider>
      </AuthProvider>
    </BrandingProvider>
  );
};

export default App;
