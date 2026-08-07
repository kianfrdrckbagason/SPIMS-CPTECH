import api from './api';

const BASE_PATH = '/spare-parts';

export const createSparePart = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllSpareParts = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getSparePartById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateSparePart = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteSparePart = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};
