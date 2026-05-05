/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE = '/api';

export const api = {
  getToken: () => localStorage.getItem('debt_tracker_token'),
  setToken: (token: string) => localStorage.setItem('debt_tracker_token', token),
  clearToken: () => localStorage.removeItem('debt_tracker_token'),

  async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
      this.clearToken();
      window.dispatchEvent(new Event('auth-expired'));
      throw new Error('Authentication expired');
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'API Error');
    return data;
  },

  login: (credentials: any) => api.request('/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getDebtors: () => api.request('/debtors'),
  getDebts: () => api.request('/debts'),
  getAreas: () => api.request('/areas'),
  addDebt: (debt: any) => api.request('/debts', { method: 'POST', body: JSON.stringify(debt) }),
  updateDebtStatus: (id: number, status: string) => api.request(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  payAllDebts: (debtorId: number) => api.request(`/debtors/${debtorId}/pay-all`, { method: 'PATCH' }),
  getAdminStats: () => api.request('/admin/stats'),
};
