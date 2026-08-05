import { createContext } from 'react';
import type { LoginCredentials, UserProfile } from '../api/auth.api';

/**
 * Se extiende UserProfile para incluir los nuevos campos de perfil.
 * Estos campos vienen del GET /auth/profile — asegúrate de que
 * el backend los incluya en la respuesta de getProfile().
 */
export interface AuthContextType {
  user:            UserProfile | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  login:           (credentials: LoginCredentials) => Promise<void>;
  logout:          () => Promise<void>;
  hasPermission:   (module: string, action: string) => boolean;
  refreshProfile:  () => Promise<void>; // ← nuevo: recarga el perfil desde el backend
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
