'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/kpis');
      return res.data.data;
    },
  });

  const kpis = data?.kpis || {};

  const cards = [
    { label: 'Total Products', value: kpis.totalProducts?.toLocaleString('id-ID') || '—', icon: '📦', color: 'primary' },
    { label: 'Stock Locations', value: kpis.totalStockLocations?.toLocaleString('id-ID') || '—', icon: '📍', color: 'info' },
    { label: 'Low Stock Items', value: kpis.lowStockCount?.toLocaleString('id-ID') || '—', icon: '⚠️', color: 'danger' },
    { label: 'Pending PO', value: kpis.pendingPO?.toLocaleString('id-ID') || '—', icon: '🛒', color: 'warning' },
    { label: 'Pending SO', value: kpis.pendingSO?.toLocaleString('id-ID') || '—', icon: '📤', color: 'info' },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-sm text-text-muted">
          {user?.warehouse?.name || 'All Warehouses'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <div className="card-body py-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className={`text-2xl font-bold mt-2 ${card.color === 'danger' ? 'text-danger' : card.color === 'warning' ? 'text-warning' : card.color === 'info' ? 'text-info' : 'text-primary-900'}`}>
                {isLoading ? '...' : card.value}
              </div>
              <div className="label text-text-muted mt-1">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <span className="text-xs font-semibold">Quick Actions</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'New PO', href: '/purchase-orders/new', icon: '🛒' },
              { label: 'New SO', href: '/sales-orders/new', icon: '📤' },
              { label: 'Transfer', href: '/transfers', icon: '🔃' },
              { label: 'Adjustment', href: '/adjustments', icon: '📋' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated hover:bg-bg-subtle border border-border rounded-lg text-sm font-medium text-text-primary transition-colors"
              >
                <span>{action.icon}</span>
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span className="text-xs font-semibold">Recent Stock Movements</span>
          <a href="/stock-movements" className="text-xs text-primary-500 hover:underline">View All →</a>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-text-muted text-center">Loading...</div>
          ) : (data?.recentMovements?.length || 0) > 0 ? (
            <div className="divide-y divide-border">
              {data?.recentMovements?.slice(0, 10).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`badge badge-${m.type === 'RECEIPT' ? 'success' : m.type === 'ISSUE' ? 'danger' : m.type === 'ADJUSTMENT_IN' ? 'info' : m.type === 'TRANSFER' ? 'primary' : 'neutral'}`}>
                      {m.type}
                    </span>
                    <div>
                      <div className="font-medium text-text-primary">{m.product?.name || '—'}</div>
                      <div className="text-text-muted font-mono">{m.product?.sku || ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      {m.type === 'RECEIPT' || m.type === 'ADJUSTMENT_IN' || m.type === 'RETURN_IN' ? '+' : m.type === 'ISSUE' || m.type === 'ADJUSTMENT_OUT' || m.type === 'RETURN_OUT' ? '-' : ''}
                      {Number(m.qty).toLocaleString('id-ID')}
                    </div>
                    <div className="text-text-muted">
                      {new Date(m.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-text-muted text-center">No recent movements</div>
          )}
        </div>
      </div>
    </div>
  );
}