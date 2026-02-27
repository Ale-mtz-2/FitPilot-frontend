import { create } from "zustand";
import { devtools } from 'zustand/middleware';
import { User } from "../types/api";

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  language: 'es' | 'en';
  setAuth: (data: { token: string }) => void;
  clearAuth: () => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setAuthChecked: (checked: boolean) => void;
  setLanguage: (lang: 'es' | 'en') => void;
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      authChecked: false,
      language: (localStorage.getItem('language') as 'es' | 'en') || 'es',

      setAuth: ({ token }) => {
        set({
          token,
          isAuthenticated: true,
          authChecked: true,
        });
      },

      clearAuth: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          authChecked: true,
        });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          authChecked: true,
        });
      },

      setAuthChecked: (checked) => set({ authChecked: checked }),

      setLanguage: (lang) => {
        localStorage.setItem('language', lang);
        set({ language: lang });
      },
    }),
    { name: 'NewAuthStore' }
  )
);
