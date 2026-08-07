import api from './api';

const BASE_PATH = '/borrowed-tools';

export const borrowTool = async (data) => {
  const response = await api.post(`${BASE_PATH}/borrow`, data);
  return response.data;
};

export const returnBorrowedTool = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/return/${id}`, data || {});
  return response.data;
};

export const markOverdue = async () => {
  const response = await api.post(`${BASE_PATH}/mark-overdue`);
  return response.data;
};

export const getAllBorrowedTools = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getBorrowedToolById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const deleteBorrowedTool = async (id, body) => {
  const response = await api.delete(`${BASE_PATH}/${id}`, { data: body || {} });
  return response.data;
};

export const createBorrowedTool = borrowTool;
export const updateBorrowedTool = returnBorrowedTool;
