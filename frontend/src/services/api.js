import axios from 'axios'

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on 401
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
const authApi = {
  login: (formData) => api.post('/auth/token', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// Analysis API
const analysisApi = {
  // Create new analysis
  create: (data) => api.post('/analysis', data),
  
  // Get all analyses
  getAll: () => api.get('/analysis'),
  
  // Get single analysis by ID
  get: (id) => api.get(`/analysis/${id}`),
  
  // Get analysis status
  status: (id) => api.get(`/analysis/${id}/status`),
  
  // Get analysis history
  history: (params = {}) => api.get('/analysis/history', { params }),
  
  // Cancel/delete analysis
  cancel: (id) => api.delete(`/analysis/${id}`),
}

// Reports API
const reportsApi = {
  // Generate report
  generate: (data) => api.post('/reports/generate', data),
  
  // Get report by ID
  get: (id) => api.get(`/reports/${id}`),
  
  // Get user reports
  getUserReports: (params = {}) => api.get('/reports', { params }),
  
  // List all reports
  list: () => api.get('/reports'),
  
  // Download report
  download: (id) => api.get(`/reports/${id}/download`, {
    responseType: 'blob'
  }),
  
  // Share report
  share: (id, data) => api.post(`/reports/${id}/share`, data),
  
  // Delete report
  delete: (id) => api.delete(`/reports/${id}`),
}

// Market Data API
const marketDataApi = {
  // Collect market data
  collect: (data) => api.post('/market-data/collect', data),
  
  // Get collection status
  status: (id) => api.get(`/market-data/${id}/status`),
  
  // Get dashboard data
  getDashboardData: (params = {}) => api.get('/market-data/dashboard', { params }),
  
  // Get API usage stats
  getApiUsage: () => api.get('/market-data/api-usage'),
  
  // Test API connection
  testConnection: (data) => api.post('/market-data/test-connection', data),
  
  // Reset API usage (admin only)
  resetUsage: () => api.post('/market-data/reset-usage'),
  
  // Export dashboard data
  exportData: (params = {}) => api.get('/market-data/export', {
    params,
    responseType: 'blob'
  }),
}

// Export everything
export {
  api,
  authApi,
  analysisApi,
  reportsApi,
  marketDataApi
}

// Also export as default for convenience
export default api