<!-- src/components/ScenarioModal.vue -->
<template>
  <Teleport to="body">
    <div class="modal-overlay scenario-modal" @click.self="$emit('close')">
      <div class="modal-card" :style="{ direction: isRtl ? 'rtl' : 'ltr' }">
        <div class="modal-header">
          <h3>{{ txt.title }}</h3>
          <button class="close-btn" @click="$emit('close')">&times;</button>
        </div>

        <!-- لیست سناریوهای موجود -->
        <div class="scenario-list">
          <div v-for="sc in scenarios" :key="sc.id" class="scenario-item">
            <div class="sc-info">
              <span class="sc-type">{{ sc.type === 'once' ? txt.once : txt.recurring }}</span>
              <span class="sc-time">{{ formatScenarioTime(sc) }}</span>
              <span class="sc-action">→ {{ sc.action === 'on' ? txt.on : txt.off }}</span>
              <span v-if="sc.channelIndex !== undefined" class="sc-channel">({{ txt.channel }} {{ sc.channelIndex + 1 }})</span>
            </div>
            <button class="delete-sc" @click="$emit('delete', sc.id)">&times;</button>
          </div>
          <p v-if="!scenarios.length" class="empty-msg">{{ txt.empty }}</p>
        </div>

        <!-- فرم افزودن سناریوی جدید -->
        <form @submit.prevent="addNew" class="add-form">
          <!-- نوع سناریو -->
          <div class="form-row">
            <label>{{ txt.type }}</label>
            <select v-model="form.type">
              <option value="once">{{ txt.once }}</option>
              <option value="recurring">{{ txt.recurring }}</option>
            </select>
          </div>

          <!-- انتخاب کانال (فقط برای دستگاه‌های چند کاناله) -->
          <div class="form-row" v-if="channels.length > 1">
            <label>{{ txt.channel }}</label>
            <select v-model.number="form.channelIndex">
              <option v-for="(_, i) in channels" :key="i" :value="i">{{ txt.channel }} {{ i + 1 }}</option>
            </select>
          </div>

          <!-- انتخاب عملیات -->
          <div class="form-row">
            <label>{{ txt.action }}</label>
            <select v-model="form.action">
              <option value="on">{{ txt.on }}</option>
              <option value="off">{{ txt.off }}</option>
            </select>
          </div>

          <!-- تاریخ و ساعت برای نوع یک‌بار -->
          <div v-if="form.type === 'once'" class="form-row">
            <label>{{ store.calendarSystem === 'shamsi' ? 'تاریخ و ساعت (شمسی)' : 'تاریخ و ساعت (میلادی)' }}</label>
            
            <!-- انتخابگر میلادی -->
            <input v-if="store.calendarSystem === 'miladi'" 
                   type="datetime-local" 
                   v-model="form.datetime" 
                   required />
            
            <!-- انتخابگر شمسی -->
            <div v-else class="shamsi-picker">
              <select v-model="shamsi.y" @change="syncFromShamsi">
                <option v-for="y in shamsiYears" :key="y" :value="y">{{ y }}</option>
              </select>
              <select v-model="shamsi.m" @change="syncFromShamsi">
                <option v-for="(name, i) in monthsFa" :value="i+1" :key="i">{{ name }}</option>
              </select>
              <select v-model="shamsi.d" @change="syncFromShamsi">
                <option v-for="d in daysInMonth" :value="d" :key="d">{{ d }}</option>
              </select>
              <input type="time" v-model="form.time" @input="syncFromShamsi" required />
            </div>
          </div>

          <!-- روزها + ساعت برای نوع تکرارشونده -->
          <div v-else class="form-row">
            <label>{{ txt.days }}</label>
            <div class="day-checks">
              <label v-for="d in daysList" :key="d.value" class="day-check-label">
                <input type="checkbox" :value="d.value" v-model="form.days" class="real-checkbox" />
                <span class="custom-box"></span>
                {{ d.label }}
              </label>
            </div>
            <label style="margin-top: 12px;">{{ txt.time }}</label>
            <input type="time" v-model="form.time" required />
          </div>

          <button type="submit" class="save-btn">{{ txt.add }}</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store } from '../store.js'
import moment from 'moment-jalaali'


const props = defineProps({ deviceId: String, largeId: String, smallId: String })
const emit = defineEmits(['close', 'delete'])

// دریافت سناریوهای دستگاه فعلی
const scenarios = computed(() => {
  const dev = findDeviceById(props.deviceId)
  return dev?.scenarios || []
})

// دریافت کانال‌های دستگاه
const channels = computed(() => {
  const device = findDeviceById(props.deviceId)
  if (!device) return []
  
  let count = 1
  if (device.type === 'switch2') count = 2
  else if (device.type === 'switch3') count = 3
  
  if (device.channels && device.channels.length === count) {
    return device.channels
  }
  return Array.from({ length: count }, (_, i) => ({ id: i, label: '', status: false }))
})

// فرم سناریوی جدید
const form = ref({ 
  type: 'once', 
  channelIndex: 0, 
  action: 'on', 
  datetime: '',  // ← ← ← این باید میلادی (ISO) باشد
  days: [], 
  time: '' 
})

// تاریخ شمسی برای UI
const shamsi = ref({ 
  y: new Date().getFullYear() - 621,
  m: 1, 
  d: 1 
})

const shamsiYears = computed(() => {
  const currentYear = new Date().getFullYear() - 621
  return Array.from({ length: 10 }, (_, i) => currentYear + i)
})

const isRtl = computed(() => store.lang !== 'en')
const monthsFa = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']

const daysInMonth = computed(() => {
  if (shamsi.value.m <= 6) return 31
  if (shamsi.value.m <= 11) return 30
  return 29
})

// دیکشنری ترجمه
const txt = computed(() => {
  const t = {
    fa: { 
      title: 'مدیریت سناریوها', once: 'یک‌بار', recurring: 'تکرارشونده', channel: 'کانال', 
      action: 'عملیات', on: 'روشن', off: 'خاموش', datetime: 'تاریخ و ساعت', 
      days: 'روزهای تکرار', time: 'ساعت', add: '➕ افزودن سناریو', 
      empty: 'هنوز سناریویی تعریف نشده',
      daysList: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] 
    },
    en: { 
      title: 'Scenario Manager', once: 'One-time', recurring: 'Recurring', channel: 'Channel', 
      action: 'Action', on: 'ON', off: 'OFF', datetime: 'Date & Time', 
      days: 'Repeat Days', time: 'Time', add: '➕ Add Scenario', 
      empty: 'No scenarios yet',
      daysList: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] 
    },
    ar: { 
      title: 'إدارة السيناريوهات', once: 'مرة واحدة', recurring: 'متكرر', channel: 'قناة', 
      action: 'إجراء', on: 'تشغيل', off: 'إيقاف', datetime: 'التاريخ والوقت', 
      days: 'أيام التكرار', time: 'الوقت', add: '➕ إضافة سيناريو', 
      empty: 'لا توجد سيناريوهات بعد',
      daysList: ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'] 
    }
  }
  return t[store.lang] || t.en
})

const daysList = computed(() => txt.value.daysList.map((label, index) => ({ value: index, label })))

// ✅ تابع فرمت زمان برای نمایش در لیست
function formatScenarioTime(sc) {
  if (sc.type === 'once' && sc.datetime) {
    return new Date(sc.datetime).toLocaleString(store.lang === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }
  if (sc.type === 'recurring') {
    const daysText = (sc.days || [])
      .map(d => txt.value.daysList[d])
      .filter(Boolean)
      .join('، ')
    return `${daysText} - ${sc.time || '--:--'}`
  }
  return '-'
}

// ==================== ✅ توابع تبدیل تاریخ شمسی ↔ میلادی ====================
// ==================== ✅ توابع تبدیل تاریخ شمسی ↔ میلادی ====================

// تبدیل شمسی به میلادی (برای محاسبات داخلی)
// ==================== ✅ توابع تبدیل تاریخ شمسی ↔ میلادی (نسخه‌ی قطعی) ====================

// تبدیل شمسی به میلادی (دقیق و تست‌شده)
function jalaaliToGregorian(jy, jm, jd) {
  const gy = jy + 621
  let leapG = (gy % 4 === 0) && (gy % 100 !== 0 || gy % 400 === 0)
  const march = leapG ? 20 : 21
  let jdDays = jd + (jm <= 6 ? (jm - 1) * 31 : 186 + (jm - 7) * 30)
  let gyDay = march + jdDays - (leapG ? 1 : 0)
  let gm = 1, gd = gyDay
  const monthDays = [31, leapG ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  while (gm <= 12 && gd > monthDays[gm - 1]) { gd -= monthDays[gm - 1]; gm++ }
  return { gy, gm, gd }
}

// تبدیل میلادی به شمسی (دقیق و تست‌شده)
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

// ✅ همگام‌سازی: شمسی → میلادی/UTC (برای ارسال به بک‌اند)
function syncFromShamsi() {
  const { y, m, d } = shamsi.value
  const [hours, minutes] = (form.value.time || '00:00').split(':').map(Number)
  
  try {
    // ✅ ساخت رشته شمسی
    const jalaliStr = `${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')} ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`
    
    // ✅ پارس کردن به عنوان تاریخ شمسی و تبدیل به میلادی/UTC
    const mDate = moment(jalaliStr, 'jYYYY/jMM/jDD HH:mm')
    
    // ✅ دریافت تاریخ میلادی و تبدیل به ISO/UTC
    form.value.datetime = mDate.toDate().toISOString()
    
    console.log(`📅 Jalali ${jalaliStr} → UTC ${form.value.datetime}`)
  } catch (err) {
    console.error('❌ Conversion error:', err)
    alert('خطا در تبدیل تاریخ: ' + err.message)
  }
}

// ✅ همگام‌سازی: میلادی/ISO → شمسی (برای نمایش در UI)
function syncToShamsi() {
  if (!form.value.datetime) return
  try {
    const d = new Date(form.value.datetime)
    
    // ✅ خواندن بر اساس ساعت محلی (Local) سیستم کاربر، نه UTC
    const j = gregorianToJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    
    shamsi.value = { y: j.jy, m: j.jm, d: j.jd }
    
    // استخراج ساعت و دقیقه محلی به فرمت HH:mm
    const pad = n => String(n).padStart(2, '0')
    form.value.time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    
    console.log(`📅 ISO ${form.value.datetime} → Local Jalali ${j.jy}/${j.jm}/${j.jd} ${form.value.time}`)
  } catch (err) {
    console.warn('⚠️ Failed to convert to Shamsi:', err)
  }
}

// ✅ افزودن سناریوی جدید
async function addNew() {
  if (!form.value.time) {
    alert(txt.value.time + ' الزامی است')
    return
  }
  
  if (form.value.type === 'once') {
    if (store.calendarSystem === 'shamsi') {
      syncFromShamsi()  // ← ← ← تبدیل با timezone ایران
    }
    // ✅ اعتبارسنجی فرمت ISO (با یا بدون offset)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(form.value.datetime)) {
      alert('فرمت تاریخ نامعتبر است')
      return
    }
  }
  
  if (form.value.type === 'recurring' && !form.value.days?.length) {
    alert('حداقل یک روز را انتخاب کنید')
    return
  }

  try {
    await store.addScenario(props.deviceId, { 
      ...form.value,
      days: form.value.days.map(d => Number(d)),
      channelIndex: channels.value.length > 1 ? form.value.channelIndex : 0
    })
    
    // ریست فرم
    form.value = { type: 'once', channelIndex: 0, action: 'on', datetime: '', days: [], time: '' }
    shamsi.value = { y: new Date().getFullYear() - 621, m: 1, d: 1 }
  } catch (err) {
    console.error('Failed to add scenario:', err)
    alert('خطا در افزودن سناریو: ' + err.message)
  }
}

function findDeviceById(deviceId) {
  for (const loc of store.locations) {
    for (const room of loc.children || []) {
      const dev = room.devices?.find(d => d.id === deviceId)
      if (dev) return dev
    }
  }
  return null
}

// وقتی سیستم تقویم تغییر کرد، تاریخ را به شمسی تبدیل کن برای نمایش
watch(() => store.calendarSystem, () => {
  if (form.value.datetime) syncToShamsi()  // ← ← ← نام صحیح تابع
})

onMounted(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30)
  form.value.time = now.toTimeString().slice(0, 5)
  form.value.datetime = now.toISOString().slice(0, 16)
  syncToShamsi()  // ← ← ← نمایش اولیه به شمسی
})
</script>

<style scoped>
.modal-overlay { 
  position: fixed; inset: 0; 
  height: 100dvh; 
  background: rgba(0,0,0,0.7); 
  backdrop-filter: blur(5px); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 9999; 
  padding: 16px; 
  box-sizing: border-box;
  overflow-y: auto;
}

.modal-card { 
  background: rgba(25,35,55,0.95); 
  border: 1px solid rgba(255,255,255,0.2); 
  border-radius: 18px; 
  width: min(96vw, 600px); 
  max-height: 90dvh; 
  overflow-y: auto; 
  padding: 24px 24px 80px 24px; 
  box-shadow: 0 15px 40px rgba(0,0,0,0.5); 
  box-sizing: border-box; 
  direction: unset; 
  margin: auto;
}

.modal-header { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 16px; color: #ffffff;
}

.close-btn { 
  background: none; border: none; color: white; 
  font-size: 24px; cursor: pointer; line-height: 1; 
}

.scenario-list { 
  margin-bottom: 20px; max-height: 200px; overflow-y: auto; 
}

.scenario-item { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 10px; background: rgba(255,255,255,0.05); 
  border-radius: 10px; margin-bottom: 8px; font-size: 13px; 
  flex-wrap: wrap; gap: 6px; 
}

.sc-type { 
  background: rgba(34,211,238,0.2); padding: 2px 8px; 
  border-radius: 6px; color: #22d3ee; font-size: 11px; 
}

.sc-time, .sc-action, .sc-channel { 
  opacity: 0.8; color: rgba(255,255,255,0.9);
}

.sc-channel {
  background: rgba(255,255,255,0.1);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.delete-sc { 
  background: none; border: none; color: #f87171; 
  cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; 
}

.empty-msg { 
  text-align: center; opacity: 0.5; padding: 20px; 
  color: rgba(255,255,255,0.6);
}

.add-form { 
  display: flex; flex-direction: column; gap: 14px; 
}

.form-row { 
  display: flex; flex-direction: column; gap: 6px; 
}

.form-row label { 
  font-size: 12px; opacity: 0.8; font-weight: 500;  
  color: rgba(255,255,255,0.85);
}

.form-row select, .form-row input { 
  width: 100%; padding: 12px 14px; border-radius: 10px; 
  border: 1px solid rgba(255,255,255,0.2); 
  background: rgba(15, 23, 42, 0.9); color: #f1f5f9; 
  font-size: 14px; outline: none; 
  appearance: none; -webkit-appearance: none; -moz-appearance: none; 
  box-sizing: border-box; 
}

.form-row select { 
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); 
  background-repeat: no-repeat; background-position: left 12px center; padding-left: 36px; 
}

[dir="ltr"] .form-row select { 
  background-position: right 12px center; padding-left: 14px; padding-right: 36px; 
}

.form-row select option { 
  background: #0f172a; color: #f1f5f9; padding: 8px; 
}

.form-row select:focus, .form-row input:focus { 
  border-color: rgba(34,211,238,0.5); 
  box-shadow: 0 0 0 3px rgba(34,211,238,0.1); 
}

.form-row input[type="datetime-local"],
.form-row input[type="time"] {
  color: #ffffff !important;
}

.form-row input[type="datetime-local"]::-webkit-calendar-picker-indicator,
.form-row input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.85;
  cursor: pointer;
}

.shamsi-picker { 
  display: grid; grid-template-columns: 1fr 1.2fr 1fr 1.5fr; gap: 8px; 
}

.shamsi-picker select, .shamsi-picker input { min-width: 0; }

.day-checks { 
  display: flex; flex-wrap: wrap; gap: 8px; 
}

.day-check-label { 
  display: inline-flex; align-items: center; gap: 6px; 
  background: rgba(255,255,255,0.08); padding: 8px 12px; 
  border-radius: 8px; font-size: 12px; cursor: pointer; 
  border: 1px solid transparent; transition: 0.2s; user-select: none; 
}

.day-check-label:has(.real-checkbox:checked) { 
  background: rgba(34,211,238,0.15); border-color: rgba(34,211,238,0.3); color: #22d3ee; 
}

.real-checkbox { 
  position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; 
}

.custom-box { 
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); 
  border-radius: 4px; background: rgba(255,255,255,0.05); 
  display: inline-block; position: relative; flex-shrink: 0; transition: 0.2s; 
}

.custom-box::after { 
  content: ''; position: absolute; display: none; 
  left: 4px; top: 0px; width: 5px; height: 9px; 
  border: solid #22d3ee; border-width: 0 2px 2px 0; transform: rotate(45deg); 
}

.real-checkbox:checked + .custom-box { 
  background: rgba(34,211,238,0.2); border-color: #22d3ee; 
}

.real-checkbox:checked + .custom-box::after { display: block; }

.save-btn { 
  padding: 16px; font-size: 16px; margin-top: 24px; margin-bottom: 20px; 
}

.save-btn:active { transform: scale(0.98); }
</style>