// src/api/apiClient.js
import axios from 'axios'
import { getAuthToken, clearAuthToken } from '../utils/authSession.js'

// ✅ هاردکد آدرس بک‌اند برای تست (بعداً می‌توانید به حالت داینامیک برگردانید)
const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json' 
  },
  withCredentials: true,
  timeout: 10000  // ✅ تایم‌اوت ۱۰ ثانیه‌ای برای تشخیص سریع‌تر خطا
})

apiClient.interceptors.request.use(config => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`)  // ← لاگ دیباگ
  return config
})

apiClient.interceptors.response.use(
  response => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)  // ← لاگ دیباگ
    return response
  },
  error => {
    console.error(`❌ API Error: ${error.response?.status || 'NO_RESPONSE'} ${error.config?.url}`, error.message)  // ← لاگ دیباگ
    
    const status = error.response?.status
    const url = error.config?.url || ''

    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      clearAuthToken()
      if (!url.includes('/auth/me') && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient