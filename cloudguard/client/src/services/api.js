import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to all outgoing requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cloudguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Auth APIs
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

// Scan APIs
export const scanApi = {
  createScan: (payload, isFormData = false) => {
    return api.post('/scans', payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
  },
  getScans: (params) => api.get('/scans', { params }),
  getScanById: (id) => api.get(`/scans/${id}`),
  getScanFindings: (id, params) => api.get(`/scans/${id}/findings`, { params }),
  rescan: (id, payload) => api.post(`/scans/${id}/rescan`, payload),
  applyFix: (id, payload) => api.post(`/scans/${id}/fix`, payload),
  simulateFixes: (id, payload) => api.post(`/scans/${id}/simulate`, payload),
  getRemediationReport: (id) => api.get(`/scans/${id}/remediation-report`)
};

// Finding APIs
export const findingApi = {
  getById: (id) => api.get(`/findings/${id}`),
  updateStatus: (id, status) => api.patch(`/findings/${id}/status`, { status }),
  getAttackPath: (id) => api.get(`/findings/${id}/attack-path`)
};

// Dashboard APIs
export const dashboardApi = {
  getStats: () => api.get('/dashboard')
};

// Rules APIs
export const ruleApi = {
  getRules: () => api.get('/rules'),
  getRuleById: (ruleId) => api.get(`/rules/${ruleId}`)
};

// AI APIs (Phase 8 bridge)
export const aiApi = {
  explain: (payload) => api.post('/ai/explain', payload),
  remediation: (payload) => api.post('/ai/remediation', payload)
};

export default api;
