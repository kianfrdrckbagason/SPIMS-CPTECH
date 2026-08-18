import api from './api';

const BASE_PATH = '/transactions';

export const createTransaction = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllTransactions = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getTransactionById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateTransaction = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteTransaction = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};

// Monthly Excel-style inventory sheet
// params: { month, year, itemType, category }
export const getMonthlySheet = async (params) => {
  const response = await api.get(`${BASE_PATH}/monthly-sheet`, { params });
  return response.data;
};
