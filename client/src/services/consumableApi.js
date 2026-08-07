import api from './api';

const BASE_PATH = '/consumables';

export const createConsumable = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllConsumables = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getConsumableById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateConsumable = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteConsumable = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};
