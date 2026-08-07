import api from './api';

const BASE_PATH = '/categories';

export const createCategory = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllCategories = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getCategoryById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};
