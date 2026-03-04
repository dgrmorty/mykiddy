
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { CourseDetail } from './views/CourseDetail';
import { Profile } from './views/Profile';
import { Schedule } from './views/Schedule';
import { AiTutor } from './views/AiTutor';
import { AdminPanel } from './views/AdminPanel';
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

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isGuest, isLoading } = useAuth();
    if (isLoading) return null;
    if (isGuest || user.role !== Role.ADMIN) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isLoading, user, switchRole } = useAuth();

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
            <div className="rounded-full border-2 border-white/20 border-t-[#e6002b] animate-spin" style={{ width: 40, height: 40 }} />
        </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} onSwitchRole={switchRole} />}>
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
          
          <Route path="schedule" element={
            <ProtectedRoute>
                <Schedule />
            </ProtectedRoute>
          } />
          
          <Route path="ai-tutor" element={
            <ProtectedRoute>
                <AiTutor />
            </ProtectedRoute>
          } />

          <Route path="admin" element={
            <AdminRoute>
                <AdminPanel />
            </AdminRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
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
