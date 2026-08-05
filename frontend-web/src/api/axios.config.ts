import axios from 'axios';

/**
 * Cliente HTTP base.
 * Todas las llamadas al backend pasan por aquí.
 *
 * baseURL viene del .env — VITE_API_URL=http://localhost:3000/api/v1
 * Si la variable no está definida usa localhost como fallback.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de REQUEST
 * Antes de cada llamada, lee el access_token del localStorage
 * y lo agrega automáticamente al header Authorization.
 * Así no tenés que agregar el token manualmente en cada llamada.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Interceptor de RESPONSE
 * Maneja los errores de autenticación automáticamente.
 *
 * Si el backend retorna 401 (token expirado o inválido):
 *   1. Intenta renovar el token con el refresh_token
 *   2. Si la renovación funciona, reintenta el request original
 *   3. Si la renovación falla, limpia los tokens y redirige al login
 *
 * Esto es transparente para el usuario — no nota que el token se renovó.
 */
api.interceptors.response.use(
  // Respuesta exitosa — la deja pasar sin cambios
  (response) => response,

  // Error en la respuesta
  async (error) => {
    const originalRequest = error.config;

    // Verificar si es un 401 y si ya intentamos renovar el token
    // _retry evita un loop infinito si el refresh también falla
    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login');

    if (is401 && !alreadyRetried && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          throw new Error('No hay refresh token');
        }

        // Llamar al endpoint de refresh con el refresh_token
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );

        // Guardar los nuevos tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        // Reintentar el request original con el nuevo access_token
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        // El refresh falló — limpiar tokens y redirigir al login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
