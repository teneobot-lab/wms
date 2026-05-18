import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Density = 'compact' | 'default';

interface UIState {
  sidebarCollapsed: boolean;
  tableDensity: Density;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTableDensity: (density: Density) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      tableDensity: 'default',
      sidebarWidth: 220,

      toggleSidebar: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
          sidebarWidth: state.sidebarCollapsed ? 220 : 52,
        }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed, sidebarWidth: collapsed ? 52 : 220 });
      },

      setTableDensity: (density) => set({ tableDensity: density }),
    }),
    { name: 'wms-ui' }
  )
);

// Toast notifications store
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));

    // Auto-dismiss after 4s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Network status store
interface NetworkState {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}));