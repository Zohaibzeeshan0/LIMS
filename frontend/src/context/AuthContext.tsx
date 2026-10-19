'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  api,
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
  REMEMBER_KEY,
} from '@/lib/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  employeeId: string;
  department: string;
  role: 'ADMIN' | 'QA_MANAGER' | 'QC_ANALYST' | 'LAB_TECHNICIAN' | 'AUDITOR';
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<void>;
  loginAs: (role: User['role']) => Promise<void>;
  logout: () => Promise<void>;
  rememberedIdentifier: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USERS = [
  {
    role: 'ADMIN' as const,
    email: 'admin@citypharma.com',
    employeeId: 'EMP-001',
    name: 'Dr. Tariq Mahmood',
    title: 'QC Director / Admin',
    desc: 'Full administrative rights & configuration',
  },
  {
    role: 'QA_MANAGER' as const,
    email: 'qa.manager@citypharma.com',
    employeeId: 'EMP-014',
    name: 'Fatima Noor',
    title: 'QA Manager',
    desc: 'Lot release, CoA issuance, OOS review',
  },
  {
    role: 'QC_ANALYST' as const,
    email: 'qc.analyst@citypharma.com',
    employeeId: 'EMP-088',
    name: 'Zaid Siddiqui',
    title: 'Senior QC Analyst',
    desc: 'Sample testing, worksheet entry, OOS raising',
  },
  {
    role: 'LAB_TECHNICIAN' as const,
    email: 'lab.tech@citypharma.com',
    employeeId: 'EMP-105',
    name: 'Bilal Raza',
    title: 'Lab Technician',
    desc: 'Sample accessioning, calibration logs',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberedIdentifier, setRememberedIdentifier] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Load saved session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (typeof window !== 'undefined') {
        const savedRemembered = localStorage.getItem(REMEMBER_KEY);
        if (savedRemembered) {
          setRememberedIdentifier(savedRemembered);
        }

        const storedToken = getStoredToken();
        const storedUser = getStoredUser<User>();

        if (storedToken && storedUser) {
          setUser(storedUser);
          setToken(storedToken);

          // Background verification of token validity
          try {
            const freshProfile = await api.get<User>('/auth/me');
            if (isMounted) {
              setUser(freshProfile);
            }
          } catch (e) {
            // If verification fails, api.request handles refresh automatically.
            // If refresh fails too, clearStoredSession will be triggered.
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Route protection guard
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user && isLoginPage) {
      router.replace('/');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (identifier: string, pass: string, rememberMe: boolean = true) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        email: identifier.trim(),
        password: pass,
      });

      setStoredSession(res.accessToken, res.refreshToken, res.user, rememberMe);
      setToken(res.accessToken);
      setUser(res.user);

      if (rememberMe) {
        setRememberedIdentifier(identifier.trim());
      }

      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAs = async (role: User['role']) => {
    const demo = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    await login(demo.email, 'Admin@1234', true);
  };

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      clearStoredSession();
      setToken(null);
      setUser(null);
      setIsLoading(false);
      router.replace('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginAs,
        logout,
        rememberedIdentifier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
