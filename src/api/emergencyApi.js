// src/api/emergencyApi.js
import apiClient from './apiClient'

export const emergencyApi = {
  // دریافت لیست شماره‌ها
  async getContacts() {
    const res = await apiClient.get('/user/emergency-contacts')
    return res.data
  },

  // افزودن شماره جدید
  async addContact(data) {
    const res = await apiClient.post('/user/emergency-contacts', data)
    return res.data
  },

  // حذف شماره
  async deleteContact(id) {
    const res = await apiClient.delete(`/user/emergency-contacts/${id}`)
    return res.data
  }
}