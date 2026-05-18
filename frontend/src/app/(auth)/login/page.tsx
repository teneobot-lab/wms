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
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      addToast('success', `Selamat datang, ${user.name}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A2F3A] flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏭</span>
            <div>
              <h1 className="text-2xl font-bold text-white">WMS Pro</h1>
              <p className="text-sm text-white/60">Warehouse Management System</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Kelola Inventori<br />Dengan Lebih Cerdas
            </h2>
            <p className="text-white/70 text-lg">
              Sistem manajemen gudang terintegrasi untuk mengontrol stok,
              melacak pergerakan, dan mengoptimalkan operasi gudang Anda.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs">✓</span>
              Real-time Stock Tracking
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs">✓</span>
              Multi-location Support
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs">✓</span>
              Purchase & Sales Orders
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs">✓</span>
              Comprehensive Reports
            </div>
          </div>
        </div>

        <p className="text-white/40 text-sm">© 2024 WMS Pro. All rights reserved.</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F7F6F3] p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏭</span>
              <span className="text-xl font-bold text-[#2C4A5A]">WMS Pro</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#2C4A5A]">Masuk</h2>
            <p className="text-sm text-gray-500 mt-1">
              Masukkan kredensial Anda untuk mengakses sistem
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@warehouse.com"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/20 focus:border-[#2C4A5A] bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/20 focus:border-[#2C4A5A] bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2C4A5A] text-white font-medium text-sm rounded hover:bg-[#1A2F3A] transition-colors disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3">Akun Demo</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between bg-white p-2 rounded border">
                <span className="text-gray-600">admin@warehouse.com</span>
                <span className="font-mono text-gray-500">wms2024</span>
              </div>
              <div className="flex justify-between bg-white p-2 rounded border">
                <span className="text-gray-600">manager@warehouse.com</span>
                <span className="font-mono text-gray-500">wms2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}