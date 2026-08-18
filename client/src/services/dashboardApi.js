import api from './api';

export const getStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data.data;
};

export const getRecentActivity = async (limit) => {
  const response = await api.get('/dashboard/recent-activity', {
    params: limit ? { limit } : undefined,
  });
  return response.data.data;
};

export const getMonthlyTransactions = async () => {
  const response = await api.get('/dashboard/charts/monthly-transactions');
  return response.data.data;
};

export const getCategoryDistribution = async () => {
  const response = await api.get('/dashboard/charts/category-distribution');
  return response.data.data;
};

export const getFrequentParts = async (limit) => {
  const response = await api.get('/dashboard/charts/frequent-parts', {
    params: limit ? { limit } : undefined,
  });
  return response.data.data;
};

export const getAdminSummary = async () => {
  const response = await api.get('/dashboard/admin-summary');
  return response.data.data;
};

export const getLowStockItems = async () => {
  const response = await api.get('/dashboard/low-stock-items');
  return response.data.data;
};

export const getOutOfStockItems = async () => {
  const response = await api.get('/dashboard/out-of-stock-items');
  return response.data.data;
};

export const getStockInHistory = async (limit) => {
  const response = await api.get('/dashboard/stock-in-history', {
    params: limit ? { limit } : undefined,
  });
  return response.data.data;
};

export const getStockOutHistory = async (limit) => {
  const response = await api.get('/dashboard/stock-out-history', {
    params: limit ? { limit } : undefined,
  });
  return response.data.data;
};

export const getCurrentMonthStockInHistory = async (limit = 50) => {
  const response = await api.get('/dashboard/stock-in-history', {
    params: { limit, currentMonth: 'true' },
  });
  return response.data.data;
};

export const getCurrentMonthStockOutHistory = async (limit = 50) => {
  const response = await api.get('/dashboard/stock-out-history', {
    params: { limit, currentMonth: 'true' },
  });
  return response.data.data;
};
