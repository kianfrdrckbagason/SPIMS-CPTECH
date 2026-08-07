import api from './api';

export const categoriesApi = {
  getAll: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  archive: (id) => api.put(`/categories/${id}/archive`),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const sparePartsApi = {
  getAll: (params) => api.get('/spare-parts', { params }),
  getById: (id) => api.get(`/spare-parts/${id}`),
  create: (data) => api.post('/spare-parts', data),
  update: (id, data) => api.put(`/spare-parts/${id}`, data),
  delete: (id) => api.delete(`/spare-parts/${id}`),
  getHistory: (id) => api.get(`/transactions/spare-part/${id}/history`),
};

export const consumablesApi = {
  getAll: (params) => api.get('/consumables', { params }),
  getById: (id) => api.get(`/consumables/${id}`),
  create: (data) => api.post('/consumables', data),
  update: (id, data) => api.put(`/consumables/${id}`, data),
  delete: (id) => api.delete(`/consumables/${id}`),
};

export const suppliersApi = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const toolsApi = {
  getAll: (params) => api.get('/tools', { params }),
  getById: (id) => api.get(`/tools/${id}`),
  create: (data) => api.post('/tools', data),
  update: (id, data) => api.put(`/tools/${id}`, data),
  delete: (id) => api.delete(`/tools/${id}`),
};

export const borrowedToolsApi = {
  getAll: (params) => api.get('/borrowed-tools', { params }),
  getById: (id) => api.get(`/borrowed-tools/${id}`),
  borrow: (data) => api.post('/borrowed-tools/borrow', data),
  returnTool: (id, data) => api.put(`/borrowed-tools/return/${id}`, data),
  markOverdue: () => api.post('/borrowed-tools/mark-overdue'),
  delete: (id) => api.delete(`/borrowed-tools/${id}`),
};

export const stockInApi = {
  sparePart: (data) => api.post('/stock-in/spare-part', data),
  consumable: (data) => api.post('/stock-in/consumable', data),
};

export const stockOutApi = {
  sparePart: (data) => api.post('/stock-out/spare-part', data),
  consumableRelease: (data) => api.post('/stock-out/consumable', data),
};

export const adjustmentsApi = {
  sparePart: (data) => api.post('/adjustments/spare-part', data),
  consumable: (data) => api.post('/adjustments/consumable', data),
};

export const dailyConsumptionApi = {
  create: (data) => api.post('/daily-consumption', data),
  getAll: (params) => api.get('/daily-consumption', { params }),
  getMonthlySummary: (params) => api.get('/daily-consumption/summary/monthly', { params }),
};

export const transactionsApi = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
};

export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
};

export const reportsApi = {
  transactions: (params, responseType = 'blob') =>
    api.get('/reports/transactions', { params, responseType }),
  stockStatus: (params, responseType = 'blob') =>
    api.get('/reports/stock-status', { params, responseType }),
  borrowedTools: (params, responseType = 'blob') =>
    api.get('/reports/borrowed-tools', { params, responseType }),
  consumables: (params, responseType = 'blob') =>
    api.get('/reports/consumables', { params, responseType }),
  inventorySummary: () => api.get('/reports/inventory-summary'),
};
