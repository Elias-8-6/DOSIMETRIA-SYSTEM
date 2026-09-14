import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { login as loginApi, logout as logoutApi, getProfile } from '../api/auth.api';
import type { LoginCredentials, UserProfile } from '../api/auth.api';
import { AuthContext } from './auth.context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Un 401 acá dispara automáticamente el intento de refresh
        // del interceptor de axios (axios.config.ts); solo llegan a este
        // catch los fallos de autenticación genuinos (sin refresh token
        // válido).
        const profile = await getProfile();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    await loginApi(credentials);
    const profile = await getProfile();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // limpiar sesión local aunque falle el backend
    } finally {
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      // mantener perfil actual
    }
  }, []);

  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (!user) return false;
      return user.permissions.some((p) => p.module === module && p.action === action);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      hasPermission,
      refreshProfile,
    }),
    [user, isLoading, login, logout, hasPermission, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
