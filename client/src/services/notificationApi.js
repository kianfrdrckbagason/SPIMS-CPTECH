import api from './api';

const BASE_PATH = '/notifications';

export const createNotification = async (data) => {
  const response = await api.post(BASE_PATH, data);
  return response.data;
};

export const getAllNotifications = async (params) => {
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

export const getNotificationById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const updateNotification = async (id, data) => {
  const response = await api.put(`${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.post(`${BASE_PATH}/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.post(`${BASE_PATH}/read-all`);
  return response.data;
};
