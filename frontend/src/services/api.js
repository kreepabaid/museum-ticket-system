import axios from 'axios';

// Connects to local Express server or API Gateway
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('museum_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me'),

  // Exhibitions & Schedules
  getExhibitions: () => apiClient.get('/exhibitions'),
  getExhibition: (id) => apiClient.get(`/exhibitions/${id}`),
  createExhibition: (data) => apiClient.post('/admin/exhibitions', data),
  getSchedules: (exhibitionId, date) => {
    const url = date ? `/exhibitions/${exhibitionId}/schedules?date=${encodeURIComponent(date)}` : `/exhibitions/${exhibitionId}/schedules`;
    return apiClient.get(url);
  },
  createSchedule: (exhibitionId, data) => apiClient.post(`/admin/exhibitions/${exhibitionId}/schedules`, data),

  // Bookings
  createBooking: (data) => apiClient.post('/bookings', data),
  cancelBooking: (id) => apiClient.post(`/bookings/${id}/cancel`),
  getMyBookings: () => apiClient.get('/bookings/me'),
  getBooking: (id) => apiClient.get(`/bookings/${id}`),

  // Tickets
  getTicket: (ticketId) => apiClient.get(`/tickets/${ticketId}`),

  // Admin
  validateTicket: (ticketId, qrPayload) => apiClient.post('/admin/tickets/validate', { ticketId, qrPayload }),
  getAdminDashboard: () => apiClient.get('/admin/dashboard'),
  getExhibitionStats: () => apiClient.get('/admin/exhibition-stats'),
  getDailyStats: () => apiClient.get('/admin/daily-stats'),
  getLiveEntries: () => apiClient.get('/admin/entries'),
  getReports: () => apiClient.get('/admin/reports'),

  // Notifications & Utilities
  getNotifications: () => apiClient.get('/notifications/me'),
  resetDemoSeed: () => apiClient.post('/admin/seed/reset'),
};

export default api;
