// src/store.js
import { reactive } from 'vue'
import { dashboardApi } from './api/dashboardApi.js'
import { scenarioApi } from './api/scenarioApi.js'
import { authApi } from './api/auth.js'
import { getAuthToken } from './utils/authSession.js'
import moment from 'moment-jalaali'

export const DEVICE_TYPES = [
  { 
    id: 'switch1', 
    name: { fa: 'کلید یک‌پل', en: 'Single Switch', ar: 'مفتاح أحادي' }, 
    icon: '🔘' 
  },
  { 
    id: 'switch2', 
    name: { fa: 'کلید دو‌پل', en: 'Double Switch', ar: 'مفتاح ثنائي' }, 
    icon: '🔘🔘' 
  },
  { 
    id: 'switch3', 
    name: { fa: 'کلید سه‌پل', en: 'Triple Switch', ar: 'مفتاح ثلاثي' }, 
    icon: '🔘🔘🔘' 
  },
  { 
    id: 'socket', 
    name: { fa: 'پریز هوشمند', en: 'Smart Socket', ar: 'مقبس ذكي' }, 
    icon: '🔌' 
  }
]

export const store = reactive({
  themeIndex: 0,
  lang: 'fa',
  isLoggedIn: false,
  currentUser: null,
  authMethod: 'password',
  calendarSystem: 'shamsi',
  tempUnit: 'celsius',
  locations: [],
  _prefSaveTimer: null,
  sessionReady: false,

  applyPreferences(prefs = {}) {
    if (prefs.lang) this.lang = prefs.lang
    if (prefs.theme !== undefined) this.themeIndex = prefs.theme
    if (prefs.calendarSystem) this.calendarSystem = prefs.calendarSystem
    if (prefs.tempUnit) this.tempUnit = prefs.tempUnit
    if (typeof document !== 'undefined') {
      document.documentElement.dir = this.lang === 'en' ? 'ltr' : 'rtl'
      document.documentElement.lang = this.lang
    }
  },

  async savePreferences() {
    if (!this.isLoggedIn) return
    try {
      await dashboardApi.updateProfile({
        preferences: {
          lang: this.lang,
          theme: this.themeIndex,
          calendarSystem: this.calendarSystem,
          tempUnit: this.tempUnit
        }
      })
    } catch (err) {
      console.warn('⚠️ Failed to save preferences:', err)
    }
  },

  _scheduleSavePreferences() {
    clearTimeout(this._prefSaveTimer)
    this._prefSaveTimer = setTimeout(() => this.savePreferences(), 500)
  },

  setTheme(i) {
    this.themeIndex = i
    this._scheduleSavePreferences()
  },

  setLang(l) {
    this.lang = l
    if (typeof document !== 'undefined') {
      document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl'
      document.documentElement.lang = l
    }
    this._scheduleSavePreferences()
  },

  setAuthMethod(method) {
    this.authMethod = method
  },

  setCalendarSystem(cal) {
    this.calendarSystem = cal
    this._scheduleSavePreferences()
  },

  setTempUnit(unit) {
    this.tempUnit = unit
    this._scheduleSavePreferences()
  },

  setSession(user) {
    this.isLoggedIn = true
    this.currentUser = user
    this.applyPreferences(user.preferences)
    if (!user.timezone) {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      dashboardApi.updateProfile({ timezone: detectedTz }).catch(err => {
        console.warn('⚠️ Failed to save timezone:', err)
      })
    }
  },

  clearSession() {
    this.isLoggedIn = false
    this.currentUser = null
    this.locations = []
  },

  async initSession() {
    try {
      if (!getAuthToken()) {
        this.clearSession()
        return false
      }
      const res = await authApi.me()
      if (res.success && res.user) {
        this.setSession(res.user)
        await this.loadDashboard()
        return true
      }
      this.clearSession()
    } catch {
      this.clearSession()
    } finally {
      this.sessionReady = true
    }
    return false
  },

  async logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    if (typeof window !== 'undefined') disconnectSocket()
    this.clearSession()
    this.sessionReady = true
  },

  async loadDashboard() {
    if (!this.isLoggedIn) return
    try {
      const res = await dashboardApi.getDashboard()
      if (res?.success && Array.isArray(res.data)) {
        this.locations = res.data
      }
    } catch (err) {
      console.warn('⚠️ Load from server failed:', err)
    }
  },

  async addLocation(type, parentId = null, data = {}) {
    const name = data.name || (type === 'large'
      ? (this.lang === 'fa' ? 'مکان جدید' : 'New Location')
      : (this.lang === 'fa' ? 'فضای جدید' : 'New Space'))
    try {
      const res = await dashboardApi.addLocation({ type, parentId, ...data, name })
      if (res?.success) {
        await this.loadDashboard()
        return res.data
      }
      throw new Error(res?.message || 'ذخیره مکان ناموفق بود')
    } catch (err) {
      console.error('⚠️ addLocation failed:', err)
      throw err
    }
  },

  async deleteLocation(id) {
    await dashboardApi.deleteLocation(id)
    await this.loadDashboard()
  },

  async deleteChild(parentId, childId) {
    await dashboardApi.deleteLocation(childId)
    await this.loadDashboard()
  },

  updateLocation(id, updates) {
    const loc = this.locations.find(l => String(l.id) === String(id))
    if (loc) Object.assign(loc, updates)
    dashboardApi.updateLocation(id, updates).catch(err => {
      console.warn('⚠️ Update sync failed:', err)
      this.loadDashboard()
    })
  },

  updateChild(parentId, childId, updates) {
    const parent = this.locations.find(l => String(l.id) === String(parentId))
    const child = parent?.children?.find(c => String(c.id) === String(childId))
    if (child) Object.assign(child, updates)
    dashboardApi.updateLocation(childId, updates).catch(err => {
      console.warn('⚠️ Update child sync failed:', err)
      this.loadDashboard()
    })
  },

  async addDevice(largeId, smallId, typeId) {
    console.log(`🔍 store.addDevice: largeId=${largeId}, smallId=${smallId}, typeId=${typeId}`);
    const largeIdStr = String(largeId);
    const smallIdStr = String(smallId);
    const deviceType = DEVICE_TYPES.find(t => t.id === typeId);
    if (!deviceType) { console.error('❌ Device type not found:', typeId); return null; }
    const largeLoc = this.locations.find(l => String(l.id) === largeIdStr);
    if (!largeLoc) { console.error('❌ Large location not found:', largeIdStr); return null; }
    const smallLoc = largeLoc.children?.find(c => String(c.id) === smallIdStr);
    if (!smallLoc) { console.error('❌ Small location not found:', smallIdStr); return null; }
    try {
      console.log(`📤 Calling dashboardApi.addDevice with:`, {
        spaceId: smallIdStr, type: typeId,
        name: deviceType.name[this.lang] || deviceType.name.fa
      });
      const res = await dashboardApi.addDevice({
        spaceId: smallIdStr, type: typeId,
        name: deviceType.name[this.lang] || deviceType.name.fa,
        icon: deviceType.icon, status: false
      });
      console.log(`✅ API response:`, res);
      if (!res?.success) throw new Error(res?.message || 'پاسخ ناموفق از سرور');
      console.log(`🔄 Calling loadDashboard...`);
      await this.loadDashboard();
      console.log(`✅ loadDashboard completed`);
      const newDevice = this.getDevice(res.data?.id);
      console.log(`✅ Found new device in store:`, newDevice?.id);
      return newDevice;
    } catch (err) {
      console.error('⚠️ Add device failed:', err);
      alert('خطا در افزودن دستگاه: ' + (err.message || 'خطای ناشناخته'));
      return null;
    }
  },

  async deleteDevice(largeId, smallId, deviceId) {
    try {
      await dashboardApi.deleteDevice(deviceId)
      await this.loadDashboard()
    } catch (err) { console.warn('⚠️ Delete device failed:', err) }
  },

  async updateDevice(largeId, smallId, deviceId, updates) {
    const largeLoc = this.locations.find(l => String(l.id) === String(largeId))
    const smallLoc = largeLoc?.children?.find(c => String(c.id) === String(smallId))
    const device = smallLoc?.devices?.find(d => String(d.id) === String(deviceId))
    if (device) Object.assign(device, updates)
    try { await dashboardApi.updateDevice(deviceId, updates) }
    catch (err) { console.warn('⚠️ Update device failed:', err) }
  },

async toggleDeviceStatus(largeId, smallId, deviceId, status, channelIndex = 0) {
  console.log(`📦 Store Received: status = ${status} for device ${deviceId}`);
  
  const largeLoc = this.locations.find(l => String(l.id) === String(largeId))
  const smallLoc = largeLoc?.children?.find(c => String(c.id) === String(smallId))
  const device = smallLoc?.devices?.find(d => String(d.id) === String(deviceId))
  if (!device) return

  // ✅ مقداردهی اولیه‌ی channels اگر خالی باشد
  if (!device.channels) {
    let count = 1
    if (device.type === 'switch2') count = 2
    else if (device.type === 'switch3') count = 3
    device.channels = Array.from({ length: count }, (_, i) => ({
      id: i, label: '', status: device.status || false
    }))
  }

  device._isToggling = true

  // ✅ ← ← ← حیاتی: جایگزینی کل آرایه برای تحریک Reactivity در Vue
  if (channelIndex !== null && device.channels?.[channelIndex] !== undefined) {
    const newChannels = [...device.channels]
    newChannels[channelIndex] = { ...newChannels[channelIndex], status: status }
    device.channels = newChannels // ← ← ← این خط Reactivity را تحریک می‌کند!
  } else {
    device.status = status
    if (device.channels?.length) {
      const newChannels = device.channels.map(ch => ({ ...ch, status: status }))
      device.channels = newChannels
    }
  }

  try {
    await dashboardApi.updateDevice(deviceId, {
      status,
      channelIndex,
      channels: device.channels
    })
    setTimeout(() => { if (device) device._isToggling = false }, 2000)
  } catch (err) {
    console.warn('⚠️ Toggle sync failed:', err)
    device._isToggling = false
    // Rollback
    if (channelIndex !== null && device.channels?.[channelIndex] !== undefined) {
      const newChannels = [...device.channels]
      newChannels[channelIndex] = { ...newChannels[channelIndex], status: !status }
      device.channels = newChannels
    } else {
      device.status = !status
      if (device.channels?.length) {
        const newChannels = device.channels.map(ch => ({ ...ch, status: !status }))
        device.channels = newChannels
      }
    }
  }
},

  getLargeLocation(id) { return this.locations.find(l => String(l.id) === String(id)) },
  
  getSmallLocation(largeId, smallId) { 
    const large = this.getLargeLocation(largeId)
    return large?.children?.find(c => String(c.id) === String(smallId)) 
  },

  getDevice(deviceId) {
    for (const large of this.locations) {
      for (const small of large.children || []) {
        const device = (small.devices || []).find(d => String(d.id) === String(deviceId))
        if (device) return device
      }
    }
    return null
  },

  _findDeviceById(deviceId) { 
    for (const loc of this.locations) { 
      for (const room of loc.children || []) { 
        const dev = room.devices?.find(d => String(d.id) === String(deviceId))
        if (dev) return dev 
      } 
    } 
    return null 
  },

  updateDevicePairing(largeId, smallId, cardDeviceId, pairingData) {
    const large = this.locations.find(l => String(l.id) === String(largeId))
    const small = large?.children?.find(c => String(c.id) === String(smallId))
    const device = small?.devices?.find(d => String(d.id) === String(cardDeviceId))
    if (!device) return
    if (pairingData.pairedDeviceId) device.pairedDeviceId = pairingData.pairedDeviceId
    if (pairingData.pairedAt) device.pairedAt = pairingData.pairedAt
    dashboardApi.updateDevice(cardDeviceId, {
      pairedDeviceId: pairingData.pairedDeviceId || device.pairedDeviceId,
      pairedAt: pairingData.pairedAt || new Date().toISOString()
    }).catch(err => console.warn('⚠️ Pairing sync failed:', err))
  },

  removeDevicePairing(largeId, smallId, cardDeviceId) {
    const large = this.locations.find(l => String(l.id) === String(largeId))
    const small = large?.children?.find(c => String(c.id) === String(smallId))
    const device = small?.devices?.find(d => String(d.id) === String(cardDeviceId))
    if (!device) return
    device.pairedDeviceId = null
    device.pairedAt = null
    dashboardApi.updateDevice(cardDeviceId, { pairedDeviceId: null, pairedAt: null })
      .catch(err => console.warn('⚠️ Unpair sync failed:', err))
  },

  getPairedDevice(largeId, smallId, cardDeviceId) {
    const large = this.locations.find(l => String(l.id) === String(largeId))
    const small = large?.children?.find(c => String(c.id) === String(smallId))
    const device = small?.devices?.find(d => String(d.id) === String(cardDeviceId))
    return device?.pairedDeviceId ? device : null
  },

  _scenarioInterval: null,
  initScenarioScheduler() { 
    if (this._scenarioInterval) return
    this._scenarioInterval = setInterval(() => this._checkAndExecuteScenarios(), 30000) 
  },
  
  _checkAndExecuteScenarios() { 
    const now = new Date()
    this.locations.forEach(loc => { 
      loc.children?.forEach(room => { 
        room.devices?.forEach(dev => { 
          if (!dev.scenarios) return
          dev.scenarios = dev.scenarios.filter(sc => { 
            if (!sc.enabled) return true
            if (this._shouldExecute(sc, now)) { 
              this._executeAction(dev, sc)
              return sc.type !== 'once' 
            } 
            return true 
          }) 
        }) 
      }) 
    }) 
  },
  
  _shouldExecute(sc, now) { 
    if (sc.type === 'once') { 
      const target = new Date(sc.datetime)
      return now >= target && !sc.executed 
    } 
    if (sc.type === 'recurring') { 
      const dayIndex = now.getDay()
      const [h, m] = sc.time.split(':').map(Number)
      return sc.days?.includes(dayIndex) && now.getHours() === h && now.getMinutes() === m 
    } 
    return false 
  },
  
  _executeAction(dev, sc) { 
    console.log(`📅 اجرای سناریو: ${dev.name} | کانال ${sc.channelIndex} | ${sc.action}`)
    if (dev.channels && dev.channels[sc.channelIndex] !== undefined) 
      dev.channels[sc.channelIndex].status = sc.action === 'on'
    else if (dev.brightness !== undefined) 
      dev.brightness = sc.action === 'on' ? 100 : 0
    else 
      dev.status = sc.action === 'on'
    if (sc.type === 'once') sc.executed = true 
  },

  addScenario(deviceId, scenario) { 
    const dev = this._findDeviceById(deviceId)
    if (dev) { 
      dev.scenarios = dev.scenarios || []
      const newSc = { ...scenario, id: Date.now().toString(), executed: false }
      dev.scenarios.push(newSc)
      scenarioApi.addScenario(deviceId, newSc).then(res => { 
        if (res?.success && res?.data?.id) { 
          const idx = dev.scenarios.findIndex(s => String(s.id) === String(newSc.id))
          if (idx !== -1) Object.assign(dev.scenarios[idx], res.data) 
        } 
      }).catch(err => console.warn('⚠️ Add scenario sync failed:', err)) 
    } 
  },
  
  deleteScenario(deviceId, scenarioId) { 
    const dev = this._findDeviceById(deviceId)
    if (dev) dev.scenarios = dev.scenarios.filter(s => String(s.id) !== String(scenarioId))
    scenarioApi.deleteScenario(scenarioId).catch(err => console.warn('⚠️ Delete scenario sync failed:', err)) 
  },
  
  updateScenario(deviceId, scenarioId, updates) { 
    const dev = this._findDeviceById(deviceId)
    if (dev) { 
      const idx = dev.scenarios.findIndex(s => String(s.id) === String(scenarioId))
      if (idx !== -1) Object.assign(dev.scenarios[idx], updates) 
    } 
    scenarioApi.updateScenario(scenarioId, updates).catch(err => console.warn('⚠️ Update scenario sync failed:', err)) 
  },

getAllScenarios() { 
  const allScenarios = []
  this.locations.forEach(large => { 
    large.children?.forEach(small => { 
      small.devices?.forEach(device => { 
        if (device.scenarios?.length) 
          device.scenarios.forEach(scenario => { 
            // ✅ ← ← ← فیلتر باید اینجا باشد، داخل حلقه‌ی scenario:
            if (scenario.type === 'once' && scenario.executed) return;
            
            let displayDatetime = ''
            if (scenario.type === 'once' && scenario.datetime) {
              const mMoment = moment.utc(scenario.datetime)
              displayDatetime = mMoment.format('jYYYY/jMM/jDD HH:mm')
            } else if (scenario.type === 'recurring') {
              displayDatetime = `هر ${scenario.days?.map(d => ['یک','دو','سه','چهار','پنج','جمعه','شنبه'][d]).join('، ')} ساعت ${scenario.time}`
            }
            allScenarios.push({ 
              id: scenario.id, deviceId: device.id, deviceName: device.name, 
              deviceIcon: device.icon, largeId: large.id, largeName: large.name, 
              smallId: small.id, smallName: small.name, displayDatetime, ...scenario 
            }) 
          }) 
      }) 
    }) 
  })
  return allScenarios.sort((a, b) => { 
    if (a.type === 'once' && b.type === 'once') 
      return new Date(a.datetime) - new Date(b.datetime)
    return 0 
  }) 
},
  
  toggleScenario(deviceId, scenarioId) { 
    const dev = this._findDeviceById(deviceId)
    const scenario = dev?.scenarios?.find(s => String(s.id) === String(scenarioId))
    if (scenario) { 
      scenario.enabled = !scenario.enabled
      scenarioApi.updateScenario(scenarioId, { enabled: scenario.enabled })
        .catch(err => console.warn('⚠️ Toggle scenario sync failed:', err)) 
    } 
  },
  
  deleteScenarioGlobal(deviceId, scenarioId) { 
    const dev = this._findDeviceById(deviceId)
    if (dev && dev.scenarios) 
      dev.scenarios = dev.scenarios.filter(s => String(s.id) !== String(scenarioId)) 
  }
})

if (typeof document !== 'undefined') {
  document.documentElement.dir = store.lang === 'en' ? 'ltr' : 'rtl'
  document.documentElement.lang = store.lang
}

if (import.meta.env?.DEV) {
  window.store = store
  console.log('🔧 Store exposed to window for debugging')
}

// ==================== ✅ Socket.io برای به‌روزرسانی بلادرنگ ====================

let socket = null

export function initSocket() {
  if (socket?.connected) return
  
  import('socket.io-client').then(({ io }) => {
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin
    
    socket = io(API_URL, {
      withCredentials: true,
      auth: { token: localStorage.getItem('sh_auth_token') },
      transports: ['websocket', 'polling']
    })
    
    socket.on('connect', () => console.log(`🔌 Socket connected: ${socket.id}`))
    
    // ✅ فقط یک هندلر برای device:status:update (با محافظ _isToggling)
// ✅ ← ← ← فقط این بخش را در initSocket() جایگزین کن:
// در src/store.js، داخل initSocket():
socket.on('device:status:update', (payload) => {
  console.log(`📡 Real-time device update:`, payload)
  const device = store.getDevice(payload.deviceId)
  if (device && payload.channels) {
    // ✅ ← ← ← حیاتی: اگر دستگاه در حال تغییر توسط کاربر است، آپدیت نکن!
    if (device._isToggling) {
      console.log(`⏭️ Skipping update: device is toggling`)
      return
    }
    // ✅ مقداردهی اولیه‌ی channels اگر خالی باشد
    if (!device.channels) {
      let count = 1
      if (device.type === 'switch2') count = 2
      else if (device.type === 'switch3') count = 3
      device.channels = Array.from({ length: count }, (_, i) => ({
        id: i, label: '', status: device.status || false
      }))
    }

    // ✅ جایگزینی کل آرایه برای Reactivity
    const newChannels = [...device.channels]
    Object.entries(payload.channels).forEach(([key, value]) => {
      const channelNum = parseInt(key.replace('ch', '')) - 1
      if (newChannels[channelNum] !== undefined) {
        newChannels[channelNum] = { ...newChannels[channelNum], status: value }
      }
    })
    device.channels = newChannels  // ← ← ← این خط Reactivity را تحریک می‌کند!
    device.status = newChannels.some(ch => ch.status)

    if (payload.online !== undefined) device.online = payload.online
  }
})
    
    socket.on('connect_error', (err) => console.warn(`⚠️ Socket connection error: ${err.message}`))
    socket.on('disconnect', (reason) => console.log(`🔌 Socket disconnected: ${reason}`))
  })
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('✅ Socket disconnected')
  }
}
// ==================== ✅ پایان بخش Socket.io ====================