import api from './api';

export const sparePartStockIn = async (data) => {
  const response = await api.post('/stock-in/spare-part', data);
  return response.data;
};

export const sparePartStockOut = async (data) => {
  const response = await api.post('/stock-out/spare-part', data);
  return response.data;
};

export const consumableStockIn = async (data) => {
  const response = await api.post('/stock-in/consumable', data);
  return response.data;
};

export const consumableRelease = async (data) => {
  const response = await api.post('/stock-out/consumable', data);
  return response.data;
};

export const adjustStock = async (data) => {
  const response = await api.post('/adjustments', data);
  return response.data;
};

export const getStockMovements = async (params) => {
  const response = await api.get('/transactions', { params });
  return response.data;
};

export const getStockMovementById = async (id) => {
  const response = await api.get(`/transactions/${id}`);
  return response.data;
};
