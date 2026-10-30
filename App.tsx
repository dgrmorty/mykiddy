
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { CourseDetail } from './views/CourseDetail';
import { Profile } from './views/Profile';
import { Schedule } from './views/Schedule';
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
        <div className="app-boot__mark" aria-hidden="true">
          <span className="app-boot__glow" />
          <span className="app-boot__track" />
          <span className="app-boot__orbit"><span className="app-boot__comet" /></span>
          <svg className="app-boot__code" viewBox="0 0 68 68">
            <path className="l" d="M27 25 L18 34 L27 43" />
            <path className="r" d="M41 25 L50 34 L41 43" />
            <path className="s" d="M37.5 22 L30.5 46" />
          </svg>
        </div>
        <p className="app-boot__label">Дети В ТОПЕ</p>
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
          
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<Terms />} />

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
