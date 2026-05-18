'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  {
    label: 'INVENTORY', href: '#', icon: '',
    children: [
      { label: 'Products', href: '/products', icon: '📦' },
      { label: 'Stock Locations', href: '/settings/warehouse', icon: '📍' },
      { label: 'Stock Movements', href: '/stock-movements', icon: '🔄' },
      { label: 'Transfers', href: '/transfers', icon: '🔃' },
      { label: 'Stock Adjustments', href: '/adjustments', icon: '📋' },
    ],
  },
  {
    label: 'PROCUREMENT', href: '#', icon: '',
    children: [
      { label: 'Purchase Orders', href: '/purchase-orders', icon: '🛒' },
      { label: 'Goods Receipt', href: '/purchase-orders?tab=receipts', icon: '📥' },
    ],
  },
  {
    label: 'SALES', href: '#', icon: '',
    children: [
      { label: 'Sales Orders', href: '/sales-orders', icon: '📤' },
      { label: 'Picking Orders', href: '/sales-orders?tab=picking', icon: '📦' },
    ],
  },
  {
    label: 'REPORTS', href: '#', icon: '',
    children: [
      { label: 'Stock Summary', href: '/reports/stock-summary', icon: '📈' },
      { label: 'Stock Card', href: '/reports/stock-card', icon: '📊' },
      { label: 'Movement Ledger', href: '/reports/movement-ledger', icon: '📉' },
      { label: 'Aging Stock', href: '/reports/aging-stock', icon: '⏳' },
      { label: 'Reorder List', href: '/reports/reorder-list', icon: '🔁' },
      { label: 'Stock Valuation', href: '/reports/valuation', icon: '💰' },
      { label: 'ABC Analysis', href: '/reports/abc-analysis', icon: '🏆' },
    ],
  },
  {
    label: 'SETTINGS', href: '#', icon: '',
    children: [
      { label: 'Warehouses', href: '/settings/warehouse', icon: '🏭' },
      { label: 'Users', href: '/settings/users', icon: '👥' },
      { label: 'Suppliers', href: '/settings/suppliers', icon: '🏢' },
      { label: 'Customers', href: '/settings/customers', icon: '👤' },
      { label: 'Categories', href: '/settings/categories', icon: '📁' },
      { label: 'Units', href: '/settings/units', icon: '📐' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 border-b border-white/10" style={{ height: 48 }}>
        <span className="text-lg">🏭</span>
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm text-white truncate">WMS Pro</span>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto text-white/60 hover:text-white p-1 rounded"
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <div key={item.label}>
            {!item.href.startsWith('#') ? (
              <NavLink href={item.href} active={pathname === item.href} collapsed={sidebarCollapsed} icon={item.icon}>
                {item.label}
              </NavLink>
            ) : (
              <>
                {!sidebarCollapsed && (
                  <div className="label text-white/40 px-3 mt-3 mb-1 first:mt-0">{item.label}</div>
                )}
                {item.children?.map((child) => (
                  <NavLink key={child.href} href={child.href} active={pathname === child.href} collapsed={sidebarCollapsed} icon={child.icon}>
                    {child.label}
                  </NavLink>
                ))}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-white/10">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-xs font-semibold">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{user.name}</div>
                  <div className="label text-white/40 text-[10px]">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="text-white/40 hover:text-white text-xs"
                  title="Logout"
                >
                  ⏻
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NavLink({ href, active, collapsed, icon, children }: {
  href: string;
  active: boolean;
  collapsed: boolean;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 text-xs font-medium transition-colors ${
        active
          ? 'bg-white/15 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
      style={{ height: 34 }}
    >
      {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
      {!collapsed && <span className="truncate">{children}</span>}
    </Link>
  );
}