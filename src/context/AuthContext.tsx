import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, refreshAccessToken, setAccessToken } from '../services/api';
import type { AuthUser, EmployeeRecord } from '../types/hr';

interface AuthContextValue {
  user: AuthUser | null;
  employee: EmployeeRecord | null;
  loading: boolean;
  needsSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  setupWorkspace: (params: {
    fullName: string;
    email: string;
    password: string;
    seedSampleData: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refreshProfile = useCallback(async () => {
    const me = await apiRequest<{ user: AuthUser; employee: EmployeeRecord | null }>('/api/auth/me');
    setUser(me.user);
    setEmployee(me.employee);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const bootstrap = await apiRequest<{ needsSetup: boolean }>('/api/auth/bootstrap-status', {
          skipAuthRefresh: true,
        });
        if (!mounted) return;
        setNeedsSetup(bootstrap.needsSetup);

        if (!bootstrap.needsSetup) {
          const token = await refreshAccessToken();
          if (token && mounted) {
            await refreshProfile();
          }
        }
      } catch {
        // Stay unauthenticated
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ accessToken: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuthRefresh: true,
    });
    setAccessToken(data.accessToken);
    setNeedsSetup(false);
    await refreshProfile();
  };

  const setupWorkspace = async (params: {
    fullName: string;
    email: string;
    password: string;
    seedSampleData: boolean;
  }) => {
    const data = await apiRequest<{ accessToken: string; user: AuthUser }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(params),
      skipAuthRefresh: true,
    });
    setAccessToken(data.accessToken);
    setNeedsSetup(false);
    await refreshProfile();
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', skipAuthRefresh: true });
    } finally {
      setAccessToken(null);
      setUser(null);
      setEmployee(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        loading,
        needsSetup,
        login,
        setupWorkspace,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
