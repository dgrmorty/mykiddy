import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import { runCanonicalHostRedirect } from './utils/canonicalRedirect';
import App from './App';

runCanonicalHostRedirect();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

function Fallback({ error }: { error: Error | null }) {
  const hint = error?.message?.trim() || '';
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff', fontFamily: 'system-ui', padding: 24, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <p style={{ marginBottom: 8 }}>Что-то пошло не так</p>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 12 }}>Нажмите «Обновить», чтобы попробовать снова</p>
      {hint && (
        <p style={{ fontSize: 12, color: '#71717a', marginBottom: 16, wordBreak: 'break-word', lineHeight: 1.45 }}>
          {hint.length > 220 ? `${hint.slice(0, 220)}…` : hint}
        </p>
      )}
      <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#e6002b', color: '#fff', border: 'none', borderRadius: 9999, fontWeight: 700, cursor: 'pointer' }}>
        Обновить
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    console.error('[App] render error:', e, info.componentStack);
  }
  render() {
    return this.state.hasError ? <Fallback error={this.state.error} /> : this.props.children;
  }
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error(e);
  rootElement.innerHTML = '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050505;color:#fff;font-family:system-ui;padding:24px;"><p style="margin-bottom:8px;">Ошибка загрузки</p><p style="font-size:14px;color:#a1a1aa;">Откройте консоль (F12) для подробностей</p></div>';
}