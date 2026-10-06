import axios from 'axios';
import { getAuthToken } from '../../utils/tokenHelper';
import { convertKeysToCamelCase } from '../../utils/caseConverter';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = convertKeysToCamelCase(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (sessionStorage.getItem('playerToken') || localStorage.getItem('playerToken')) {
            window.location.href = '/';
          } else {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api'}/auth/refresh`,
          { token }
        );

        const newToken = refreshResponse.data.token;
        localStorage.setItem('token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('playerToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;


