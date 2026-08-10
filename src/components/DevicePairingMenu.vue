<!-- src/components/DevicePairingMenu.vue -->
<template>
  <div class="pairing-menu" :style="menuPositionStyle">
    <button class="menu-btn" @click.stop="showMenu = !showMenu" :title="menuText">⋮</button>

    <Transition name="slide">
      <div v-if="showMenu" class="menu-dropdown" :style="dropdownPositionStyle" @click.stop>
        
        <!-- ✅ جفت‌سازی - فقط اگر دستگاه هنوز جفت نشده باشد -->
        <button 
          v-if="!isAlreadyPaired"
          class="menu-item" 
          @click="closeMenu(); startPairing()" 
          :disabled="pairing"
        >
          {{ pairing ? '⏳ ' + pairingText : '🔗 ' + pairText }}
        </button>

        <!-- ✅ نمایش وضعیت اگر جفت شده باشد -->
        <div v-else class="menu-item disabled">
          ✅ {{ t.paired }}
        </div>
        
        <!-- ✅ لیست دستگاه‌های منتظر (فقط وقتی pairing فعال است) -->
        <div v-if="pendingDevices.length > 0 && pairing && !pairingStatus.includes('🎉')" class="pending-list">
          <div 
            v-for="dev in pendingDevices" 
            :key="dev.espId" 
            class="pending-item"
            @click="selectAndConfirm(dev.espId)"
          >
            <span class="esp-id">{{ dev.espId }}</span>
            <span class="esp-meta">MAC: {{ dev.mac }}</span>
          </div>
        </div>
        
        <!-- سناریو -->
        <button class="menu-item" @click="closeMenu(); showScenarios = true">
          📅 {{ t.scenarios }}
        </button>

        <button class="menu-item" @click="closeMenu(); emit('rename-device')">
          ✏️ {{ renameText }}
        </button>
        
        <!-- ریست فکتوری -->
        <button class="menu-item danger" @click="closeMenu(); confirmFactoryReset()" :disabled="resetWaiting">
          {{ resetWaiting ? '⏳ ' + waitingText : '🗑️ ' + resetText }}
        </button>
        
        <!-- حذف دستگاه -->
        <button class="menu-item danger" @click="closeMenu(); handleDelete()">
          🗑️ {{ t.deleteDevice }}
        </button>
        
        <div v-if="pairingStatus" class="pairing-status">{{ pairingStatus }}</div>
      </div>
    </Transition>
    
    <ScenarioModal 
      v-if="showScenarios" 
      :device-id="props.deviceId" 
      :large-id="props.largeId" 
      :small-id="props.smallId" 
      @close="showScenarios = false"
      @delete="handleDeleteScenario"
    />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { store } from '../store.js'
import { pairingApi } from '../api/dashboardApi'
import ScenarioModal from './ScenarioModal.vue'

const props = defineProps({ 
  deviceId: String, 
  largeId: String, 
  smallId: String 
})
const emit = defineEmits(['reset', 'open-scenario', 'delete-device', 'rename-device'])

const showScenarios = ref(false)
const showMenu = ref(false)
const pairing = ref(false)
const pairingStatus = ref('')
const resetWaiting = ref(false)
const pendingDevices = ref([])
const loadingPending = ref(false)
let resetTimer = null

const lang = computed(() => store.lang)

// ✅ تعریف واحد t با همه‌ی کلیدها (شامل paired)
const t = computed(() => ({
  scenarios: store.lang === 'fa' ? 'سناریوها' : store.lang === 'en' ? 'Scenarios' : 'السيناريوهات',
  deleteDevice: store.lang === 'fa' ? 'حذف دستگاه' : store.lang === 'en' ? 'Delete Device' : 'حذف الجهاز',
  paired: store.lang === 'fa' ? 'جفت‌شده' : store.lang === 'en' ? 'Paired' : 'مقترن'
}))

// ✅ بررسی وضعیت جفت‌سازی با استفاده از متد getDevice استور
const isAlreadyPaired = computed(() => {
  const device = store.getDevice?.(props.deviceId)
  return !!device?.pairedDeviceId
})

const menuText = computed(() => ({ fa: 'گزینه‌ها', en: 'Options', ar: 'خيارات' })[lang.value])
const pairText = computed(() => ({ fa: 'جفت‌سازی', en: 'Pair', ar: 'ربط' })[lang.value])
const pairingText = computed(() => ({ fa: 'در حال جستجو...', en: 'Scanning...', ar: 'جاري البحث...' })[lang.value])
const waitingText = computed(() => ({ fa: 'دوباره نگه دارید...', en: 'Hold again...', ar: 'اضغط مرة أخرى...' })[lang.value])
const resetText = computed(() => ({ fa: 'ریست فکتوری', en: 'Factory Reset', ar: 'ضبط المصنع' })[lang.value])
const renameText = computed(() => ({ fa: 'تغییر نام', en: 'Rename', ar: 'إعادة تسمية' })[lang.value])
const statusTexts = computed(() => ({
  fa: { scanning: '🔍 در حال جستجو...', found: '✅ یافت شد!', paired: '🎉 موفق!', error: '❌ خطا' },
  en: { scanning: '🔍 Scanning...', found: '✅ Found!', paired: '🎉 Paired!', error: '❌ Failed' },
  ar: { scanning: '🔍 جاري البحث...', found: '✅ تم العثور!', paired: '🎉 تم!', error: '❌ خطأ' }
})[lang.value])

const menuPositionStyle = computed(() => lang.value === 'en' 
  ? { position: 'absolute', top: '10px', right: '10px', zIndex: 20 } 
  : { position: 'absolute', top: '10px', left: '10px', zIndex: 20 })

const dropdownPositionStyle = computed(() => lang.value === 'en'
  ? { position: 'absolute', top: '40px', right: 0, zIndex: 30 }
  : { position: 'absolute', top: '40px', left: 0, zIndex: 30 })

function closeMenu() { showMenu.value = false }
function handleDeleteScenario(id) { store.deleteScenario(props.deviceId, id) }
function handleDelete() { emit('delete-device', props.deviceId); }

// ✅ گرفتن نام دستگاه با استفاده از متد getDevice استور
function getDeviceDisplayName() {
  const device = store.getDevice?.(props.deviceId)
  return device?.name || 'دستگاه جدید'
}

async function startPairing() {
  pairing.value = true
  loadingPending.value = true
  pairingStatus.value = statusTexts.value.scanning
  pendingDevices.value = []  // ✅ پاک کردن قبلی‌ها
  
  try {
    const res = await pairingApi.getPendingRequests()
    pendingDevices.value = res.data || []
    
    if (pendingDevices.value.length === 0) {
      pairingStatus.value = '⚠️ هیچ دستگاهی پیدا نشد. دکمه‌ی ESP32 را ۱۰ ثانیه نگه دارید.'
      return
    }
    
    if (pendingDevices.value.length === 1) {
      setTimeout(() => {
        if (pendingDevices.value[0]?.espId && pairingStatus.value === statusTexts.value.found) {
          selectAndConfirm(pendingDevices.value[0].espId)
        }
      }, 400)
    }
  } catch (err) {
    console.error('Fetch pending error:', err)
    pairingStatus.value = statusTexts.value.error
  } finally {
    loadingPending.value = false
  }
}

async function selectAndConfirm(espId) {
  if (!props.smallId) {
    pairingStatus.value = '❌ خطا: فضای معتبر انتخاب نشده'
    return
  }
  
  if (!confirm(`آیا می‌خواهید دستگاه ${espId} را به "${getDeviceDisplayName()}" جفت کنید؟`)) {
    return
  }
  
  pairing.value = true
  pairingStatus.value = '🔄 در حال جفت‌سازی...'
  
  try {
    const device = store.getDevice?.(props.deviceId)
    const deviceType = device?.type || 'switch1'
    
    const result = await pairingApi.confirmPairing(espId, {
      userId: store.currentUser?.id,
      name: getDeviceDisplayName(),
      type: deviceType,
      icon: device?.icon || '🔘',
      spaceId: props.smallId,
      channelIndex: 0
    })
    
    pairingStatus.value = statusTexts.value.paired
    pendingDevices.value = []
    pairing.value = false
    
    // ✅ تأخیر کوتاه برای نمایش پیام
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // ✅ پاک‌سازی کامل استور و کش مرورگر
    store.locations = []
    localStorage.removeItem(`dashboard_${store.currentUser?.id}`) // اگر کش لوکال دارید
    await store.loadDashboard()
    
    // ✅ اطلاع به والد برای رفرش UI
    emit('reset')
    
    closeMenu()
    
    // ✅ رفرش کامل صفحه برای اطمینان (اگر باز هم مشکل داشتید، این خط را از کامنت خارج کنید)
    // window.location.reload()
    
    alert('✅ دستگاه با موفقیت جفت‌شد و به‌اشتراک گذاشته شد')
    
  } catch (err) {
    console.error('Pairing error:', err)
    pairingStatus.value = statusTexts.value.error + ': ' + 
      (err.response?.data?.message || err.message || 'خطای ناشناخته')
    pairing.value = false
  }
}

function confirmFactoryReset() {
  if (resetWaiting.value) executeFactoryReset()
  else {
    resetWaiting.value = true
    pairingStatus.value = '⚠️ ' + waitingText.value
    resetTimer = setTimeout(() => { resetWaiting.value = false; pairingStatus.value = '' }, 5000)
  }
}

async function executeFactoryReset() {
  try {
    await new Promise(r => setTimeout(r, 1000))
    store.removeDevicePairing(props.largeId, props.smallId, props.deviceId)
    emit('reset')
    alert('✅ ریست فکتوری انجام شد')
  } catch (e) {
    console.error('Reset error:', e)
    alert('❌ خطا در ریست')
  } finally {
    resetWaiting.value = false
    pairingStatus.value = ''
    if (resetTimer) clearTimeout(resetTimer)
  }
}

onUnmounted(() => { if (resetTimer) clearTimeout(resetTimer) })
</script>

<style scoped>
/* استایل‌های اصلی */
.pairing-menu { }
.menu-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  color: white; font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: 0.2s;
}
.menu-btn:hover { background: rgba(255,255,255,0.2); }
.menu-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.menu-dropdown {
  background: rgba(20,30,45,0.95); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;
  padding: 8px; min-width: 180px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}
.menu-item {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: transparent; border: none; color: white;
  text-align: start; font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: 0.2s;
}
.menu-item:hover { background: rgba(255,255,255,0.1); }
.menu-item.danger { color: #f87171; }
.menu-item:disabled { opacity: 0.5; cursor: not-allowed; }
.menu-item.disabled { opacity: 0.6; cursor: default; color: #22c55e; }
.pairing-status {
  font-size: 11px; opacity: 0.8; padding: 8px 12px;
  border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px;
}
.slide-enter-active, .slide-leave-active { transition: 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* ✅ استایل لیست دستگاه‌های منتظر */
.pending-list {
  margin: 8px 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 8px;
}
.pending-item {
  padding: 8px 12px;
  margin: 4px 0;
  background: rgba(34,211,238,0.1);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.pending-item:hover {
  background: rgba(34,211,238,0.2);
}
.esp-id {
  font-family: monospace;
  font-weight: 600;
}
.esp-meta {
  color: #94a3b8;
}
</style>