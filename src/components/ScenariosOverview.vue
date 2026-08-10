<!-- src/components/ScenariosOverview.vue -->
<template>
  <div class="scenarios-page" :style="{ direction: store.lang === 'en' ? 'ltr' : 'rtl' }">
    <h1 class="page-title">{{ t.title }}</h1>
    <p class="subtitle">{{ t.subtitle }}</p>

    <div v-if="allScenarios.length === 0" class="empty-state">
      {{ t.noScenarios }}
    </div>

    <div v-else class="scenarios-list">
      <div v-for="group in groupedByLocation" :key="group.largeId" class="location-section">
        <div class="section-header">
          <span class="loc-icon">📍</span>
          <h2 class="section-title">{{ group.largeName }}</h2>
        </div>

        <div v-for="space in group.spaces" :key="space.smallId" class="space-section">
          <div class="section-header sub">
            <span class="space-icon">🏠</span>
            <h3 class="section-title">{{ space.smallName }}</h3>
          </div>

          <div v-for="dev in space.devices" :key="dev.deviceId" class="device-card">
            <div class="device-info">
              <span class="device-icon">{{ dev.deviceIcon }}</span>
              <span class="device-name">{{ dev.deviceName }}</span>
            </div>

            <div class="scenarios-container">
              <div v-for="sc in dev.scenarios" :key="sc.id" class="scenario-item">
                <div class="scenario-meta">
                  <span class="badge" :class="sc.type">
                    {{ sc.type === 'once' ? t.once : t.recurring }}
                  </span>
                  <span class="time">{{ formatTime(sc) }}</span>
                </div>
                
                <div class="scenario-action">
                  {{ sc.action === 'on' ? t.turnOn : t.turnOff }}
                  <span v-if="sc.channelIndex != null" class="channel-badge">
                    {{ t.channel }} {{ sc.channelIndex + 1 }}
                  </span>
                </div>

                <div class="scenario-controls">
                  <button class="delete-btn" @click="deleteScenario(sc.deviceId, sc.id)" :title="t.delete">🗑</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../store.js'

// ✅ دیکشنری ترجمه
const t = computed(() => {
  const dict = {
    fa: {
      title: '📅 سناریوهای فعال',
      subtitle: 'لیست تمام سناریوهای برنامه‌ریزی شده',
      noScenarios: 'هنوز هیچ سناریویی برای هیچ دستگاهی تعریف نشده است.',
      once: 'یک‌بار',
      recurring: 'تکراری',
      turnOn: '✅ روشن کردن',
      turnOff: '❌ خاموش کردن',
      channel: 'کانال',
      delete: 'حذف سناریو',
      confirmDelete: 'آیا از حذف این سناریو مطمئن هستید؟',
      daysList: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
    },
    en: {
      title: '📅 Active Scenarios',
      subtitle: 'All scheduled scenarios',
      noScenarios: 'No scenarios have been defined yet.',
      once: 'One-time',
      recurring: 'Recurring',
      turnOn: '✅ Turn ON',
      turnOff: '❌ Turn OFF',
      channel: 'Channel',
      delete: 'Delete scenario',
      confirmDelete: 'Are you sure you want to delete this scenario?',
      daysList: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
    ar: {
      title: '📅 السيناريوهات النشطة',
      subtitle: 'جميع السيناريوهات المجدولة',
      noScenarios: 'لم يتم تحديد أي سيناريوهات بعد.',
      once: 'مرة واحدة',
      recurring: 'متكرر',
      turnOn: '✅ تشغيل',
      turnOff: '❌ إيقاف',
      channel: 'قناة',
      delete: 'حذف السيناريو',
      confirmDelete: 'هل أنت متأكد من حذف هذا السيناريو؟',
      daysList: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    }
  }
  return dict[store.lang] || dict.fa
})

const daysList = computed(() => t.value.daysList || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])
const allScenarios = computed(() => store.getAllScenarios())

const groupedByLocation = computed(() => {
  const map = new Map()
  allScenarios.value.forEach(sc => {
    if (!map.has(sc.largeId)) {
      map.set(sc.largeId, {
        largeId: sc.largeId,
        largeName: sc.largeName,
        spaces: new Map()
      })
    }
    const loc = map.get(sc.largeId)
    if (!loc.spaces.has(sc.smallId)) {
      loc.spaces.set(sc.smallId, {
        smallId: sc.smallId,
        smallName: sc.smallName,
        devices: new Map()
      })
    }
    const space = loc.spaces.get(sc.smallId)
    if (!space.devices.has(sc.deviceId)) {
      space.devices.set(sc.deviceId, {
        deviceId: sc.deviceId,
        deviceName: sc.deviceName,
        deviceIcon: sc.deviceIcon,
        scenarios: []
      })
    }
    space.devices.get(sc.deviceId).scenarios.push(sc)
  })
  return Array.from(map.values()).map(loc => ({
    ...loc,
    spaces: Array.from(loc.spaces.values()).map(space => ({
      ...space,
      devices: Array.from(space.devices.values())
    }))
  }))
})

// ==================== ✅ تابع formatTime با تبدیل میلادی → شمسی ====================
// ✅ در فایل ScenariosOverview.vue:
function formatTime(sc) {
  // ✅ دریافت timezone کاربر از استور
  const userTz = store.currentUser?.timezone || 'Asia/Tehran'
  
  // ✅ سناریوی یک‌بار: نمایش تاریخ و ساعت
  if (sc.type === 'once' && sc.datetime) {
    try {
      if (store.calendarSystem === 'shamsi') {
        // ✅ تبدیل UTC → timezone کاربر → شمسی
        const d = new Date(sc.datetime)
        const localStr = d.toLocaleString('en-US', { timeZone: userTz })
        const [datePart, timePart] = localStr.split(', ')
        const [month, day, year] = datePart.split('/')
        
        // تبدیل میلادی→شمسی
        const { jy, jm, jd } = gregorianToJalaali(Number(year), Number(month), Number(day))
        const pad = n => String(n).padStart(2, '0')
        
        return `${jy}/${pad(jm)}/${pad(jd)} ${timePart}`
      }
      
      // ✅ نمایش میلادی با timezone کاربر
      return new Date(sc.datetime).toLocaleString(
        store.lang === 'fa' ? 'fa-IR' : 'en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
          timeZone: userTz
        }
      )
    } catch (err) {
      console.warn('⚠️ Format error:', err)
      return sc.datetime
    }
  }
  
  // ✅ سناریوی تکرارشونده: نمایش روزها + ساعت
  if (sc.type === 'recurring') {
    const daysArr = sc.days || []
    if (daysArr.length > 0) {
      const daysText = daysArr
        .map(idx => t.value.daysList[idx])
        .filter(Boolean)
        .join('، ')
      return `${daysText} - ${sc.time || '--:--'}`
    }
    return sc.time || '--:--'
  }
  
  return '-'
}

// ==================== ✅ توابع تبدیل تاریخ (همان ScenarioModal) ====================
function gregorianToJalaali(gy, gm, gd) {
  const gDay = [0,31,59,90,120,151,181,212,243,273,304,334]
  let gy2 = gm > 2 ? gy + 1 : gy
  let days = 355666 + (365*gy) + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) + gd + gDay[gm-1]
  let jy = -1595 + 33 * Math.floor(days/12053)
  days %= 12053
  jy += 4 * Math.floor(days/1461)
  days %= 1461
  if (days > 365) { jy += Math.floor((days-1)/365); days = (days-1) % 365 }
  let jm, jd
  if (days < 186) { jm = 1 + Math.floor(days/31); jd = 1 + (days%31) }
  else { jm = 7 + Math.floor((days-186)/30); jd = 1 + ((days-186)%30) }
  return { jy, jm, jd }
}

function toggle(deviceId, scenarioId) {
  store.toggleScenario(deviceId, scenarioId)
}

function deleteScenario(deviceId, scenarioId) {
  if (confirm(t.value.confirmDelete)) {
    store.deleteScenarioGlobal(deviceId, scenarioId)
  }
}
</script>

<style scoped>
/* === صفحه === */
.scenarios-page { 
  padding: 20px; 
  padding-top: 90px; 
  max-width: 900px; 
  margin: 0 auto; 
}
.page-title { 
  font-size: 26px; 
  text-align: center; 
  margin-bottom: 6px; 
}
.subtitle { 
  text-align: center; 
  opacity: 0.7; 
  margin-bottom: 30px; 
}
.empty-state { 
  text-align: center; 
  padding: 60px 20px; 
  opacity: 0.6; 
  font-size: 16px; 
}

/* === بخش‌ها === */
.location-section { 
  background: rgba(255,255,255,0.06); 
  border-radius: 18px; 
  padding: 18px; 
  margin-bottom: 20px; 
}
.space-section { 
  background: rgba(255,255,255,0.03); 
  border-radius: 14px; 
  padding: 14px; 
  margin-top: 14px; 
}

/* === کارت دستگاه === */
.device-card { 
  background: rgba(0,0,0,0.25); 
  border-radius: 12px; 
  padding: 14px; 
  margin-bottom: 12px; 
}
.device-info { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  margin-bottom: 12px; 
  font-weight: 600; 
}

/* === آیتم سناریو === */
.scenario-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.08);
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 10px;
}
.scenario-meta { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  flex-wrap: wrap;
}
.badge { 
  padding: 2px 8px; 
  border-radius: 6px; 
  font-size: 11px; 
}
.badge.once { 
  background: rgba(34,197,94,0.2); 
  color: #86efac; 
}
.badge.recurring { 
  background: rgba(59,130,246,0.2); 
  color: #93c5fd; 
}
.time { 
  opacity: 0.8; 
  font-family: monospace; 
  font-size: 12px;
}
.channel-badge {
  background: rgba(34,211,238,0.2);
  color: #22d3ee;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
}
[dir="rtl"] .channel-badge {
  margin-left: 0;
  margin-right: 8px;
}
.scenario-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
}
.scenario-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.delete-btn {
  color: #ffffff;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.6;
  padding: 4px;
}
.delete-btn:hover { 
  opacity: 1; 
  color: #f87171; 
}
</style>