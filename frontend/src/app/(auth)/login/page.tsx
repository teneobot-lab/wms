'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/uiStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      addToast('success', `Welcome back, ${user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏭</div>
          <h1 className="text-xl font-semibold text-primary-900">WMS Pro</h1>
          <p className="text-sm text-text-muted mt-1">Warehouse Inventory Management</p>
        </div>

        {/* Login card */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold">Sign In</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="label block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@warehouse.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label block mb-1">Password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-default w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="label text-text-muted mb-2">Demo Accounts</p>
              <div className="space-y-1 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>admin@warehouse.com</span>
                  <span className="font-mono text-text-muted">wms2024</span>
                </div>
                <div className="flex justify-between">
                  <span>manager@warehouse.com</span>
                  <span className="font-mono text-text-muted">wms2024</span>
                </div>
                <div className="flex justify-between">
                  <span>operator@warehouse.com</span>
                  <span className="font-mono text-text-muted">wms2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}