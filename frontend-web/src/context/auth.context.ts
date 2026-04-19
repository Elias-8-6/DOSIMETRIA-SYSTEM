import { createContext } from 'react';
import type { LoginCredentials, UserProfile } from '../api/auth.api';

export interface AuthContextType {
    user:            UserProfile | null;
    isLoading:       boolean;
    isAuthenticated: boolean;
    login:           (credentials: LoginCredentials) => Promise<void>;
    logout:          () => Promise<void>;
    hasPermission:   (module: string, action: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);