import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  storeName?: string | null;
  storeDescription?: string | null;
  storeCategory?: string | null;
  isVendorApproved?: boolean | null;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'vendor';
  phone?: string;
  storeName?: string;
  storeDescription?: string;
  storeCategory?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = `${import.meta.env.BASE_URL || ''}`.replace(/\/$/, '') + '/api';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('orbit_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('orbit_token'));
  const [isLoading, setIsLoading] = useState(true);

  const updateUser = useCallback((u: AuthUser) => setUser(u), []);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem('orbit_token');
    if (!stored) { setIsLoading(false); return; }
    apiFetch('/auth/me')
      .then((data) => { setUser(data.user); setToken(stored); })
      .catch(() => { localStorage.removeItem('orbit_token'); setToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('orbit_token', data.token);
  }, []);

  const register = useCallback(async (formData: RegisterData) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('orbit_token', data.token);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem('orbit_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
