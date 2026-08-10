// src/api/dashboardApi.js
import apiClient from './apiClient'

export const dashboardApi = {
  async getDashboard() {
    const res = await apiClient.get('/user/dashboard')
    return res.data
  },

  async addLocation(data) {
    const res = await apiClient.post('/user/spaces', data)
    return res.data
  },

  async updateLocation(id, data) {
    const res = await apiClient.put(`/user/spaces/${id}`, data)
    return res.data
  },

  async deleteLocation(id) {
    const res = await apiClient.delete(`/user/spaces/${id}`)
    return res.data  // ← اضافه کردن return برای یکدستی
  },

  async addDevice(data) {
    const res = await apiClient.post('/user/devices', data)
    return res.data
  },

  async updateDevice(id, data) {
    const res = await apiClient.put(`/user/devices/${id}`, data)
    return res.data
  },

  // ✅ اصلاح حیاتی: تعریف کامل تابع deleteDevice
  async deleteDevice(id) {
    const res = await apiClient.delete(`/user/devices/${id}`)
    return res.data  // ← حیاتی: برگرداندن پاسخ برای بررسی در فرانت
  },

  async updateProfile(data) {
    const res = await apiClient.put('/user/profile', data)
    return res.data
  }
}

export const pairingApi = {
  async getPendingRequests() {
    const res = await apiClient.get('/user/pairing-requests')
    return res.data
  },

  async confirmPairing(espDeviceId, virtualDeviceData) {
    const res = await apiClient.post('/user/pairing/confirm', {
      espDeviceId,
      virtualDevice: virtualDeviceData
    })
    return res.data
  }
}