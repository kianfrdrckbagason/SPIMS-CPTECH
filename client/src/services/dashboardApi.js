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
