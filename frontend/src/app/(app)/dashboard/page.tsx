'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface KPIData {
  totalProducts: number;
  totalStockLocations: number;
  lowStockCount: number;
  pendingPO: number;
  pendingSO: number;
  totalInventoryValue: number;
  totalSKUs: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState('Selamat Pagi');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Selamat Pagi');
    else if (hour < 17) setGreeting('Selamat Siang');
    else setGreeting('Selamat Malam');
  }, [currentTime]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/kpis');
      return res.data.data;
    },
    refetchInterval: 30000, // refresh every 30 seconds
  });

  const kpis: KPIData = data?.kpis || {
    totalProducts: 0,
    totalStockLocations: 0,
    lowStockCount: 0,
    pendingPO: 0,
    pendingSO: 0,
    totalInventoryValue: 0,
    totalSKUs: 0,
  };

  // Mock chart data - replace with real API data
  const chartData = [
    { day: 'Sen', receipt: 45, issue: 32 },
    { day: 'Sel', receipt: 52, issue: 41 },
    { day: 'Rab', receipt: 38, issue: 55 },
    { day: 'Kam', receipt: 67, issue: 48 },
    { day: 'Jum', receipt: 73, issue: 62 },
    { day: 'Sab', receipt: 29, issue: 25 },
    { day: 'Min', receipt: 12, issue: 8 },
  ];

  return (
    <div className="space-y-4 text-sm text-[#2C4A5A]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {user?.warehouse?.name || 'Semua Gudang'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">📦</span>
            <span className="text-xs text-green-600">Aktif</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {isLoading ? '...' : (kpis.totalProducts || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Total Produk</div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">📍</span>
            <span className="text-xs text-blue-600">Lokasi</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {isLoading ? '...' : (kpis.totalStockLocations || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Stock Locations</div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">⚠️</span>
            {kpis.lowStockCount > 0 && <span className="text-xs text-red-600">Kritis</span>}
          </div>
          <div className={`text-2xl font-bold ${kpis.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {isLoading ? '...' : (kpis.lowStockCount || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Stok Kritis</div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">💰</span>
            <span className="text-xs text-[#D97706]">IDR</span>
          </div>
          <div className="text-xl font-bold text-gray-900 truncate">
            {isLoading ? '...' : formatCurrency(kpis.totalInventoryValue || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Nilai Inventory</div>
        </div>
      </div>

      {/* Chart + Low Stock */}
      <div className="grid grid-cols-12 gap-4">
        {/* Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 rounded">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900">Pergerakan 7 Hari Terakhir</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2C4A5A]"></span>
                Masuk
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                Keluar
              </span>
            </div>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="receipt" fill="#2C4A5A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issue" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock List */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200 rounded">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-900">Produk Stok Rendah</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-gray-400">Memuat...</div>
            ) : data?.lowStockProducts?.length > 0 ? (
              data.lowStockProducts.slice(0, 8).map((p: Record<string, unknown>) => (
                <div key={p.id as string} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{p.name as string}</div>
                    <div className="text-xs text-gray-400">{p.sku as string}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-xs font-mono font-semibold text-red-600">
                      {(p.stock as number) || 0}
                    </div>
                    <div className="text-xs text-gray-400">/ {(p.minStock as number) || 0}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-400">
                Tidak ada produk stok rendah
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Orders */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900">Pending Purchase Orders</h3>
            <a href="/purchase-orders" className="text-xs text-[#2C4A5A] hover:underline">Lihat Semua →</a>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-[#2C4A5A]">{kpis.pendingPO || 0}</div>
            <div className="text-xs text-gray-500 mt-1">PO menunggu approval</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900">Pending Sales Orders</h3>
            <a href="/sales-orders" className="text-xs text-[#2C4A5A] hover:underline">Lihat Semua →</a>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-[#D97706]">{kpis.pendingSO || 0}</div>
            <div className="text-xs text-gray-500 mt-1">SO menunggu processing</div>
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900">Pergerakan Stok Terbaru</h3>
          <a href="/stock-movements" className="text-xs text-[#2C4A5A] hover:underline">Selengkapnya →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500 uppercase">
                <th className="px-3 py-2 font-medium">Ref</th>
                <th className="px-3 py-2 font-medium">Tanggal</th>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium">Tipe</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium">Bin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">Memuat...</td>
                </tr>
              ) : data?.recentMovements?.length > 0 ? (
                data.recentMovements.slice(0, 10).map((m: Record<string, unknown>) => (
                  <tr key={m.id as string} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-500">{String(m.referenceNo || '-')}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(m.createdAt as string)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{String((m.product as Record<string, unknown>)?.name || '-')}</div>
                      <div className="text-gray-400">{String((m.product as Record<string, unknown>)?.sku || '')}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        (m.type as string) === 'RECEIPT' ? 'bg-green-100 text-green-700' :
                        (m.type as string) === 'ISSUE' ? 'bg-red-100 text-red-700' :
                        (m.type as string) === 'TRANSFER' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(m.type as string) || '-'}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${
                      (m.type as string)?.includes('IN') || (m.type as string) === 'RECEIPT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(m.type as string)?.includes('IN') || (m.type as string) === 'RECEIPT' ? '+' : '-'}{(m.qty as number) || 0}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{String((m.fromBin as Record<string, unknown>)?.code || (m.bin as Record<string, unknown>)?.code || '-')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">Tidak ada pergerakan terbaru</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Purchase Order', href: '/purchase-orders/new', icon: '🛒' },
          { label: 'Sales Order', href: '/sales-orders/new', icon: '📤' },
          { label: 'Transfer', href: '/transfers/new', icon: '🔃' },
          { label: 'Opname', href: '/adjustments/new', icon: '📋' },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-1.5 p-3 bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A] transition-colors"
          >
            <span className="text-lg">{action.icon}</span>
            <span className="text-xs font-medium">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}