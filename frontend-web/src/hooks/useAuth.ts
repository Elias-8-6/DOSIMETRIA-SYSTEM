import { useContext } from 'react';
import { AuthContext } from '../context/auth.context';

/**
 * useAuth — hook para consumir el contexto de autenticación.
 *
 * Uso en cualquier componente:
 *   const { user, login, logout, hasPermission } = useAuth();
 *
 * Lanza un error si se usa fuera del AuthProvider — ayuda a detectar
 * errores de configuración durante el desarrollo.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }

  return context;
}
