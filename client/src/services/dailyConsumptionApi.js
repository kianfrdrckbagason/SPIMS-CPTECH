import api from './api';

const BASE_PATH = '/daily-consumption';

export const createDailyConsumption = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllDailyConsumptions = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getDailyConsumptionById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateDailyConsumption = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteDailyConsumption = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};

export const getMonthlyConsumptionSummary = async (params) => {
  const response = await api.get(`${BASE_PATH}/summary/monthly`, { params });
  return response.data;
};
