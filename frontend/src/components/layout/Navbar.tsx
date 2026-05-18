'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/purchase-orders': 'Purchase Orders',
  '/sales-orders': 'Sales Orders',
  '/stock-movements': 'Stock Movements',
  '/transfers': 'Transfers',
  '/adjustments': 'Stock Adjustments',
  '/reports/stock-summary': 'Stock Summary',
  '/reports/stock-card': 'Stock Card',
  '/reports/movement-ledger': 'Movement Ledger',
  '/reports/aging-stock': 'Aging Stock',
  '/reports/reorder-list': 'Reorder List',
  '/reports/valuation': 'Stock Valuation',
  '/reports/abc-analysis': 'ABC Analysis',
  '/settings/warehouse': 'Warehouses',
  '/settings/users': 'Users',
  '/settings/suppliers': 'Suppliers',
  '/settings/customers': 'Customers',
  '/settings/categories': 'Categories',
  '/settings/units': 'Units',
};

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Build breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = routeLabels[path] || routeLabels['/' + segments[0]] || seg;
    return { path, label };
  });

  return (
    <div className="flex items-center justify-between h-full px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        <span className="text-text-muted">Home</span>
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            <span className="text-text-muted">/</span>
            <span className={i === crumbs.length - 1 ? 'text-text-primary font-medium' : 'text-text-secondary'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Global search hint */}
        <button className="flex items-center gap-2 text-xs text-text-muted border border-border rounded px-3 py-1.5 hover:border-primary-300 transition-colors">
          <span>🔍</span>
          {!document.hidden && <span className="hidden sm:inline">Search...</span>}
          <kbd className="hidden sm:inline text-[10px] bg-bg-elevated px-1 rounded">Ctrl+K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary border border-transparent hover:border-border rounded transition-colors">
          <span>🔔</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-text-primary">{user.name}</div>
              <div className="label text-text-muted text-[10px]">{user.role}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center text-xs font-semibold">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}