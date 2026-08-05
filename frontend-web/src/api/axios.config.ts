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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login');

    if (is401 && !alreadyRetried && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        return api(originalRequest);
      } catch {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
