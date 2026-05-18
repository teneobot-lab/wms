'use client';

import { QueryProvider } from '@/lib/queryClient';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppShell
        sidebar={<Sidebar />}
        navbar={<Navbar />}
        children={children}
      />
    </QueryProvider>
  );
}