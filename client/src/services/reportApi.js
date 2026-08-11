import api from './api';

const BASE_PATH = '/reports';

export const generateTransactionsReport = (params) => {
  const query = new URLSearchParams(params || {}).toString();
  return `${api.defaults.baseURL ? '' : '/api'}${BASE_PATH}/transactions${query ? '?' + query : ''}`;
};

export const generateStockStatusReport = (params) => {
  const query = new URLSearchParams(params || {}).toString();
  return `${api.defaults.baseURL ? '' : '/api'}${BASE_PATH}/stock-status${query ? '?' + query : ''}`;
};

export const generateBorrowedToolsReport = (params) => {
  const query = new URLSearchParams(params || {}).toString();
  return `${api.defaults.baseURL ? '' : '/api'}${BASE_PATH}/borrowed-tools${query ? '?' + query : ''}`;
};

export const generateConsumablesReport = (params) => {
  const query = new URLSearchParams(params || {}).toString();
  return `${api.defaults.baseURL ? '' : '/api'}${BASE_PATH}/consumables${query ? '?' + query : ''}`;
};

export const getInventorySummary = async () => {
  const response = await api.get(`${BASE_PATH}/inventory-summary`);
  return response.data;
};

export const getMonthlyInventoryReport = async (month, category = '') => {
  const response = await api.get(`${BASE_PATH}/monthly-inventory`, {
    params: { month, category },
  });
  return response.data;
};

export const getMonthlyTransactionsReport = async (month) => {
  const response = await api.get(`${BASE_PATH}/monthly-transactions`, {
    params: { month },
  });
  return response.data;
};

export const downloadFile = (url, filename) => {
  // credentials:'include' sends the httpOnly auth cookie automatically.
  // No Authorization header needed.
  return fetch(url, { credentials: 'include' })
    .then((res) => res.blob())
    .then((blob) => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
};
