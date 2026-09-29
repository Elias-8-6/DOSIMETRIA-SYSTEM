import axios from 'axios';

/**
 * Cliente HTTP base.
 * withCredentials envía cookies httpOnly (access_token / refresh_token).
 * baseURL usa el proxy de Vite en desarrollo (/api/v1 → backend).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Mutex para serializar los intentos de refresh.
 *
 * PROBLEMA: cuando el access token expira, es habitual que varias requests
 * lleguen al 401 al mismo tiempo (e.g. una página que lanza 3-4 llamadas en
 * paralelo). Sin este control, cada una dispararía su propio POST /auth/refresh,
 * y el backend (que usa rotación de tokens) invalidaría el primero al usarlo,
 * haciendo que los siguientes fallen con "refresh token inválido" → logout
 * involuntario.
 *
 * Solución: solo se ejecuta UN refresh a la vez. Las requests que llegan
 * mientras hay un refresh en curso esperan a que termine (subscribeTokenRefresh)
 * y luego se reintentan con las cookies ya renovadas.
 */
let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

function notifySubscribers(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login');

    if (!is401 || alreadyRetried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Ya hay un refresh en vuelo: encolar esta request y esperar resolución.
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((success) => {
          if (success) {
            resolve(api(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    // Somos el primero en llegar: iniciar el refresh.
    isRefreshing = true;

    try {
      await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      // Refresh exitoso: notificar a las requests encoladas y reintentarlas.
      notifySubscribers(true);
      return api(originalRequest);
    } catch {
      // Refresh fallido: notificar el fallo y redirigir al login.
      notifySubscribers(false);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
