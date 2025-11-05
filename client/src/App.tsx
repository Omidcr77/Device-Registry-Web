import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './lib/theme-context';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';
import * as api from './lib/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthChecking(false);
      return;
    }
    // verify token without flashing Login
    api.me()
      .then((user) => {
        setIsAuthenticated(true);
        if (user.settings?.security?.sessionTimeout) {
          setSessionTimeout(parseInt(user.settings.security.sessionTimeout));
        }
      })
      .catch(() => {
        try { localStorage.removeItem('token'); } catch {}
        setIsAuthenticated(false);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated && sessionTimeout) {
      const timeout = setTimeout(() => {
        handleLogout();
        alert('Your session has expired due to inactivity.');
      }, sessionTimeout * 60 * 1000); // Convert minutes to milliseconds

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, sessionTimeout]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    // Load session timeout from settings
    loadSessionTimeout();
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setSessionTimeout(null);
  };

  const loadSessionTimeout = async () => {
    try {
      const settings = await api.getSettings();
      if (settings.security?.sessionTimeout) {
        setSessionTimeout(parseInt(settings.security.sessionTimeout));
      }
    } catch (error) {
      console.error('Failed to load session timeout:', error);
    }
  };

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  return (
    <ThemeProvider>
      {isAuthenticated ? (
        <>
          <Dashboard onLogout={handleLogout} />
          {/* Only show app toasts when authenticated to avoid login noise */}
          <Toaster richColors position="top-right" />
        </>
      ) : authChecking && hasToken ? (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950" />
      ) : (
        <>
          <Login onLogin={handleLogin} />
          {/* Provide a scoped toaster for login messages only */}
          <Toaster richColors position="top-right" />
        </>
      )}
    </ThemeProvider>
  );
}
