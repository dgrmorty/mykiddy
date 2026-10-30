
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { CourseDetail } from './views/CourseDetail';
import { Profile } from './views/Profile';
import { AdminPanel } from './views/AdminPanel';
import { Community } from './views/Community';
import { UserPublicProfile } from './views/UserPublicProfile';
import { Notifications } from './views/Notifications';
import { AuthConfirmed } from './views/AuthConfirmed';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { ToastProvider } from './contexts/ToastContext';
import { ContentProvider } from './contexts/ContentContext';
import { Role } from './types';
import { AccessGate } from './components/AccessGate';
import { PrivacyPolicy } from './views/legal/PrivacyPolicy';
import { Terms } from './views/legal/Terms';
import { Consent } from './views/legal/Consent';
import { NotFound } from './views/NotFound';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isGuest, isLoading, user } = useAuth();
    if (isLoading) return null;
    if (isGuest) {
        return <Navigate to="/" replace />;
    }
    if (user.role !== Role.ADMIN && user.isApproved === false) {
        return <AccessGate />;
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
  const { isLoading, user, isGuest } = useAuth();
  const blocked = !isGuest && user.role !== Role.ADMIN && user.isApproved === false;

  if (isLoading) {
    return (
      <div className="app-boot" role="status" aria-label="Загрузка">
        {/* Продолжаем ту же фазу, что у статичного загрузчика из index.html, — без мигания при монтировании */}
        <div
          className="app-boot__bar"
          aria-hidden="true"
          style={{
            '--show-delay': `${250 - performance.now()}ms`,
            '--glide-delay': `${-(performance.now() % 1400)}ms`,
          } as React.CSSProperties}
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={blocked ? <AccessGate /> : <Dashboard user={user} />} />

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

          <Route path="notifications" element={
            <ProtectedRoute>
                <Notifications />
            </ProtectedRoute>
          } />
          
          {/* Расписания больше нет — старые ссылки ведут в обучение */}
          <Route path="schedule" element={<Navigate to="/courses" replace />} />

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
          
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="consent" element={<Consent />} />

          <Route path="*" element={<NotFound />} />
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
