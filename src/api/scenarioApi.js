// src/api/scenarioApi.js
import apiClient from './apiClient'

export const scenarioApi = {
  async addScenario(deviceId, data) {
    const res = await apiClient.post('/user/scenarios', { deviceId, ...data })
    return res.data
  },

  async deleteScenario(scenarioId) {
    const res = await apiClient.delete(`/user/scenarios/${scenarioId}`)
    return res.data
  }
}