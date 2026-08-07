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

export const downloadFile = (url, filename) => {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(url.startsWith('http') ? url : url, { headers })
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
