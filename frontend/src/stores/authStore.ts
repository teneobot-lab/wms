'use client';

import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken, refreshToken) => {
    set({ user, accessToken, refreshToken, isAuthenticated: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('wms-auth', JSON.stringify({ state: { user, accessToken, refreshToken, isAuthenticated: true } }));
    }
  },

  logout: () => {
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wms-auth');
    }
  },

  updateUser: (partial) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    }));
  },
}));