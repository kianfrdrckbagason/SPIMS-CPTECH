import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the httpOnly auth cookie on every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// No request interceptor needed — the browser sends the cookie automatically.

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Cookie-based auth: nothing to clear from localStorage.
      // Redirect to login unless already there.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
