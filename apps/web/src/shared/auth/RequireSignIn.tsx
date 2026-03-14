import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export const RequireSignIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error, login, logout, hasToken } = useAuth();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password });
      setPassword('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const combinedError = localError ?? error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <div className="text-sm text-slate-400 mb-4">
          {hasToken
            ? 'Your session is not authorized yet.'
            : 'Sign in with your local backend credentials.'}
        </div>

        {combinedError && (
          <div className="mb-4 p-3 rounded-md border border-red-800 bg-red-950/30 text-red-200 text-sm">
            {combinedError}
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <label className="block">
            <div className="text-xs text-slate-400 mb-1">Identifier</div>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <div className="text-xs text-slate-400 mb-1">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm"
              autoComplete="current-password"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || identifier.trim().length === 0 || password.length === 0}
              className="px-4 py-2 rounded-md bg-violet-700 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-300 text-sm font-medium transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            {hasToken && (
              <button
                type="button"
                onClick={logout}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm"
              >
                Sign out
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
