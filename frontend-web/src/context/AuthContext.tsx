import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { login as loginApi, logout as logoutApi, getProfile } from '../api/auth.api';
import type { LoginCredentials, UserProfile } from '../api/auth.api';
import { AuthContext } from './auth.context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await getProfile();
        setUser(profile);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await loginApi(credentials);
    localStorage.setItem('access_token',  response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    const profile = await getProfile();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Si el backend falla, igual limpiamos la sesión local
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  /**
   * refreshProfile — recarga el perfil completo desde el backend.
   * Se llama después de actualizar datos en ProfileModal para que
   * el Sidebar y cualquier otro componente reflejen los cambios.
   */
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      // Si falla, mantener el perfil actual sin cambios
    }
  }, []);

  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (!user) return false;
      return user.permissions.some(
        (p) => p.module === module && p.action === action,
      );
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        refreshProfile,  // ← nuevo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
