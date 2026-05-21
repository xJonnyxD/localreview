import { create } from 'zustand';
import type { User } from '../types';
import { getMe, logout as apiLogout } from '../api/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const user = await getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  logout: () => {
    apiLogout();
    set({ user: null });
  },
  setUser: (user) => set({ user }),
}));
