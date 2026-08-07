import api from './api';

const BASE_PATH = '/suppliers';

export const createSupplier = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllSuppliers = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getSupplierById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateSupplier = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};
