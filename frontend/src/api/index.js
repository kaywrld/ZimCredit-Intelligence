import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
}

// ── Dashboard ──────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
}

// ── Individual Searches ──────────────────────────────
export const individualSearchAPI = {
  create: (data) => api.post('/searches/individuals/', data),
  list: (params) => api.get('/searches/individuals/', { params }),
  get: (id) => api.get(`/searches/individuals/${id}`),
  submitConfirmation: (id, response) =>
    api.post(`/searches/individuals/${id}/confirm`, { response }),
  updateStatus: (id, data) =>
    api.patch(`/searches/individuals/${id}/status`, data),
  adminListAll: (params) =>
    api.get('/searches/individuals/admin/all', { params }),
}

// ── Users ──────────────────────────────
export const usersAPI = {
  updateProfile: (data) => api.put('/users/me', data),
  createUser: (data) => api.post('/users/', data),
  listUsers: (params) => api.get('/users/', { params }),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
}

// ── Subscribers ──────────────────────────────
export const subscribersAPI = {
  create: (data) => api.post('/subscribers/', data),
  list: (params) => api.get('/subscribers/', { params }),
  get: (id) => api.get(`/subscribers/${id}`),
  update: (id, data) => api.put(`/subscribers/${id}`, data),
  patch: (id, data) => api.patch(`/subscribers/${id}`, data),
  // Admin user management within a subscriber
  addAdmin: (subId, data) => api.post(`/subscribers/${subId}/users`, data),
  removeAdmin: (subId, userId) => api.delete(`/subscribers/${subId}/users/${userId}`),
  toggleAdmin: (subId, userId) => api.patch(`/subscribers/${subId}/users/${userId}/toggle-active`),
  // Searches for a subscriber (month/year/user_id filters optional)
  getSearches: (subId, params) => api.get(`/subscribers/${subId}/searches`, { params }),
}

export default api