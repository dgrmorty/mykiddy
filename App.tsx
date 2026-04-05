
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
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
        <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#050505' }}>
            <div className="relative">
              <div className="absolute inset-0 bg-kiddy-cherry/20 rounded-full blur-2xl animate-glow-pulse" />
              <div className="relative rounded-full border-2 border-white/10 border-t-[#e6002b] animate-spin" style={{ width: 44, height: 44 }} />
            </div>
            <img src="/logo-vtope.png" alt="" className="h-7 w-auto opacity-40 animate-fade-in" style={{ animationDelay: '0.3s' }} />
        </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={<Dashboard user={user} />} />
          
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
    <AuthProvider>
      <ContentProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ContentProvider>
    </AuthProvider>
  );
};

export default App;
