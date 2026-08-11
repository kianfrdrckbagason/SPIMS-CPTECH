import api from './api';

const BASE_PATH = '/inventory-recounts';

export const getRecounts = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getRecountById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const createRecount = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const submitCounts = async (id, counts) => {
  const response = await api.put(`${BASE_PATH}/${id}/counts`, { counts });
  return response.data;
};

export const completeRecount = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}/complete`, data);
  return response.data;
};

export const applyAdjustment = async (id, itemId) => {
  const response = await api.post(`${BASE_PATH}/${id}/adjust`, { itemId });
  return response.data;
};

export const deleteRecount = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};
