'use client';

import { ReactNode } from 'react';
import { useUIStore, useToastStore } from '@/stores/uiStore';

interface AppShellProps {
  sidebar: ReactNode;
  navbar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, navbar, children }: AppShellProps) {
  const { sidebarWidth } = useUIStore();
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 bg-primary-900 text-white overflow-hidden"
        style={{ width: sidebarWidth, transition: 'width 0.2s ease' }}
      >
        {sidebar}
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Navbar */}
        <div className="flex-shrink-0 bg-bg-surface border-b border-border" style={{ height: 48 }}>
          {navbar}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}