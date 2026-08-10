import apiClient from './apiClient'
import { setAuthToken, clearAuthToken } from '../utils/authSession.js'

export const authApi = {
  async register(userData) {
    const res = await apiClient.post('/auth/register', userData)
    if (res.data.token) setAuthToken(res.data.token)
    return res.data
  },

  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password })
    if (res.data.token) setAuthToken(res.data.token)
    return res.data
  },

  async logout() {
    try {
      const res = await apiClient.post('/auth/logout')
      return res.data
    } finally {
      clearAuthToken()
    }
  },

  async me() {
    const res = await apiClient.get('/auth/me')
    return res.data
  }
}
