import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Append JWT token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('forma_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 Unauthorized global logout
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && (localStorage.getItem('forma_token') || localStorage.getItem('token'))) {
      localStorage.removeItem('forma_token');
      localStorage.removeItem('token');
      localStorage.removeItem('forma_user');
      window.dispatchEvent(new Event('forma:logout'));
    }
    return Promise.reject(e);
  }
);

export const messageFromError = (e) =>
  e.response?.data?.message ||
  (!e.response
    ? 'Unable to connect to Forma AI.'
    : 'Something went wrong. Please try again.');