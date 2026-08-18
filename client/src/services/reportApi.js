import api from './api';

const BASE_PATH = '/reports';

// Always use /api prefix — the Vite proxy forwards it to the Express server.
// api.defaults.baseURL is '/api' (truthy) so we cannot use it as a guard;
// instead we construct the URL directly so fetch() in downloadFile hits the proxy.
const reportUrl = (path, params) => {
  const query = new URLSearchParams(params || {}).toString();
  return `/api${BASE_PATH}${path}${query ? '?' + query : ''}`;
};

export const generateTransactionsReport = (params) => reportUrl('/transactions', params);
export const generateStockStatusReport   = (params) => reportUrl('/stock-status', params);
export const generateBorrowedToolsReport = (params) => reportUrl('/borrowed-tools', params);
export const generateConsumablesReport   = (params) => reportUrl('/consumables', params);

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

export const downloadFile = async (url, filename) => {
  // credentials: 'include' sends the httpOnly auth cookie automatically.
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) {
    // Try to surface the server's error message instead of saving a JSON blob
    let msg = `Export failed (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) msg = json.message;
    } catch {
      // response wasn't JSON — ignore
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href     = window.URL.createObjectURL(blob);
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};
