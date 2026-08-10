import api from './api';

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  const result = response.data;
  if (!result.success) {
    const err = new Error(result.message || 'Registration failed');
    err.errors = result.errors || [];
    throw err;
  }
  return { token: result.token, user: result.user };
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  const result = response.data;
  if (!result.success) {
    const err = new Error(result.message || 'Login failed');
    err.errors = result.errors || [];
    throw err;
  }
  return { token: result.token, user: result.user };
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || 'Failed to get user');
  }
  return result.user;
};

export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const response = await api.put('/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  const result = response.data;
  if (!result.success) {
    const err = new Error(result.message || 'Failed to change password');
    err.errors = result.errors || [];
    throw err;
  }
  return result;
};
