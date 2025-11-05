import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import * as api from '../lib/api';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    // Inline validation
    let valid = true;
    setApiError(null);
    if (!username.trim()) { setUsernameError('Username is required'); valid = false; } else { setUsernameError(null); }
    if (!password) { setPasswordError('Password is required'); valid = false; } else { setPasswordError(null); }
    if (!valid) return;

    setSubmitting(true);
    api.login(username.trim(), password)
      .then(() => {
        onLogin();
      })
      .catch((err) => {
        const msg = err?.message || 'Login failed';
        setApiError(msg);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-gray-900 dark:text-white mb-2">ICT Device Registry</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Securely manage all your devices in one place
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-800/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                aria-invalid={!!usernameError}
                aria-describedby={usernameError ? 'username-error' : undefined}
                className="h-12"
              />
              {usernameError && (
                <p id="username-error" className="text-xs text-red-600 mt-1">{usernameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="h-12 pr-12"
                />
                {passwordError && (
                  <p id="password-error" className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* API error live region */}
            <div aria-live="polite" className="min-h-5 text-sm">
              {apiError && (
                <p className="text-red-600">{apiError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-200"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </span>
              ) : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              Forgot password?
            </a>
          </div>
        </div>

        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
};
