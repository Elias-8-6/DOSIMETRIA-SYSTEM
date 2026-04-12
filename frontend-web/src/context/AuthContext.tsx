import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { login as loginApi, logout as logoutApi, getProfile } from '../api/auth.api';
import type { LoginCredentials, UserProfile } from '../api/auth.api';

/**
 * Forma del contexto de autenticación.
 * Cualquier componente que use useAuth() tiene acceso a esto.
 */
interface AuthContextType {
  user: UserProfile | null; // datos del usuario autenticado
  isLoading: boolean; // true mientras carga el perfil inicial
  isAuthenticated: boolean; // true si hay sesión activa
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

/**
 * Crear el contexto con valor inicial undefined.
 * El hook useAuth() verifica que se use dentro del provider.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider — envuelve toda la app y provee el estado de autenticación.
 * Se registra en main.tsx rodeando al router.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Al montar el provider, verificar si hay una sesión activa.
   * Si hay un access_token en localStorage, cargar el perfil del usuario.
   * Esto mantiene la sesión entre recargas de página.
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Si hay token, cargar el perfil completo con permisos
        const profile = await getProfile();
        setUser(profile);
      } catch {
        // El token expiró o es inválido — limpiar todo
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * login()
   * 1. Llama al backend con email y password
   * 2. Guarda los tokens en localStorage
   * 3. Carga el perfil completo con permisos
   * 4. Actualiza el estado global
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await loginApi(credentials);

    // Guardar tokens en localStorage
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    // Cargar perfil completo con permisos para el contexto
    const profile = await getProfile();
    setUser(profile);
  }, []);

  /**
   * logout()
   * 1. Llama al backend para revocar el refresh token
   * 2. Limpia localStorage
   * 3. Limpia el estado global
   */
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
   * hasPermission()
   * Verifica si el usuario tiene un permiso específico.
   * Los componentes lo usan para mostrar u ocultar elementos de la UI.
   *
   * Ejemplo:
   *   hasPermission('users', 'create') → true/false
   */
  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (!user) return false;
      return user.permissions.some((p) => p.module === module && p.action === action);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
