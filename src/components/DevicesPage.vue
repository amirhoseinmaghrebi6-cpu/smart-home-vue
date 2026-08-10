<!-- src/components/DevicesPage.vue -->
<template>
  <div class="devices-page" :style="{ direction: store.lang === 'en' ? 'ltr' : 'rtl' }">
    <h1 class="page-title">{{ t.title }}</h1>
    <p v-if="smallLocation" class="location-path">
      {{ store.getLargeLocation(props.largeId)?.name }} &rarr; {{ smallLocation.name }}
    </p>

    <!-- بخش افزودن دستگاه -->
    <div class="add-device-section">
      <button class="btn-add" @click="showTypePicker = true">
        + {{ t.addDevice }}
      </button>

      <!-- انتخاب نوع دستگاه -->
      <div v-if="showTypePicker" class="type-picker-overlay" @click="showTypePicker = false">
        <div class="type-picker" @click.stop>
          <div class="type-picker-header">
            <span>{{ t.selectType }}</span>
            <button class="btn-close" @click="showTypePicker = false">✕</button>
          </div>
          <input 
            v-model="searchQuery" 
            class="type-search" 
            :placeholder="t.searchPlaceholder" 
            @click.stop 
          />
          <div class="type-grid">
            <button 
              v-for="type in filteredTypes" 
              :key="type.id" 
              class="type-item" 
              @click="addDevice(type.id)"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <span class="type-name">{{ type.name[store.lang] }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- لیست دستگاه‌ها -->
    <div v-if="smallLocation && smallLocation.devices?.length" class="devices-grid">
      <div
        v-for="device in smallLocation.devices"
           :key="device.id + '-' + (device.pairedDeviceId || 'unpaired')" 
        class="device-card"
      >
        <!-- هدر: آیکون + نام -->
        <div class="device-header">
          <SmartIcon
            :emoji="device.icon"
            :size="24"
            class="device-icon"
          />
          <input
            v-model="device.name"
            class="device-name"
            :placeholder="t.deviceName"
            @blur="saveDevice(device)"
            @click.stop
          />
        </div>

<!-- ✅ کنترل‌های جداگانه برای هر پل -->
<div class="device-controls">
  <div 
    v-for="(ch, index) in (device.channels || [])" 
    :key="ch.id || index"
    class="channel-toggle"
  >
    <!-- ✅ ساختار اصلی با <label> حفظ شود -->
    <label class="toggle">
      <input 
        type="checkbox" 
        :checked="ch.status"
        @change="() => toggleChannel(device, index)"
      />
      <span class="toggle-slider"></span>
    </label>
    <!-- ✅ متن لیبل -->
    <span class="toggle-label">
      {{ ch.label || `${t.switch} ${index + 1}` }}
    </span>
  </div>
</div>

        <!-- منوی دستگاه -->
        <DevicePairingMenu
          :device-id="device.id"
          :large-id="props.largeId"
          :small-id="props.smallId"
          @paired="onDevicePaired"
          @reset="onDeviceReset"
          @open-scenario="openScenarioForDevice"
          @delete-device="(id) => deleteDevice(id)"
          @rename-device="renameDevice(device)"
        />
      </div>
    </div>

    <!-- حالت خالی -->
    <div v-else class="empty-state">{{ t.noDevices }}</div>

    <!-- مودال سناریو -->
    <ScenarioModal 
      v-if="showScenarioModal" 
      :device-id="scenarioDeviceId"
      :large-id="props.largeId" 
      :small-id="props.smallId" 
      @close="closeScenarioModal"
      @delete="handleDeleteScenario"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store, DEVICE_TYPES } from '../store.js'
import DevicePairingMenu from './DevicePairingMenu.vue'
import SmartIcon from './SmartIcon.vue'
import ScenarioModal from './ScenarioModal.vue'
import { dashboardApi } from '../api/dashboardApi.js'
console.log('🔥 DEVICES PAGE LOADED - FILE: DevicesPage.vue');
const props = defineProps({ largeId: String, smallId: String })

const showTypePicker = ref(false)
const searchQuery = ref('')
const scenarioDeviceId = ref(null)
const showScenarioModal = ref(false)

const t = computed(() => {
  const dict = {
    fa: { 
      title: 'مدیریت دستگاه‌ها', addDevice: 'افزودن دستگاه', selectType: 'نوع دستگاه را انتخاب کنید', 
      searchPlaceholder: 'جستجوی دستگاه...', deviceName: 'نام دستگاه', on: 'روشن', off: 'خاموش', 
      noDevices: 'هنوز دستگاهی اضافه نکرده‌اید', confirmDelete: 'آیا از حذف این دستگاه مطمئنید؟', switch: 'کلید'
    },
    en: { 
      title: 'Device Manager', addDevice: 'Add Device', selectType: 'Select device type', 
      searchPlaceholder: 'Search devices...', deviceName: 'Device name', on: 'ON', off: 'OFF', 
      noDevices: 'No devices added yet', confirmDelete: 'Are you sure you want to delete this device?', switch: 'Switch'
    },
    ar: { 
      title: 'إدارة الأجهزة', addDevice: 'إضافة جهاز', selectType: 'اختر نوع الجهاز', 
      searchPlaceholder: 'بحث عن جهاز...', deviceName: 'اسم الجهاز', on: 'تشغيل', off: 'إيقاف', 
      noDevices: 'لم تضف أي أجهزة بعد', confirmDelete: 'هل أنت متأكد من حذف هذا الجهاز؟', switch: 'مفتاح'
    }
  }
  return dict[store.lang] || dict.fa
})

const filteredTypes = computed(() => {
  if (!searchQuery.value) return DEVICE_TYPES
  const query = searchQuery.value.toLowerCase()
  return DEVICE_TYPES.filter(type => 
    type.name[store.lang]?.toLowerCase().includes(query) || type.id.toLowerCase().includes(query)
  )
})

const smallLocation = computed(() => store.getSmallLocation(props.largeId, props.smallId))

// ==================== توابع ====================

async function addDevice(typeId) {
  console.log(`🔍 addDevice called: typeId=${typeId}, smallId=${props.smallId}, largeId=${props.largeId}`);
  const currentSmallId = String(props.smallId || '');
  if (!props.smallId) {
    console.warn('⚠️ smallId is undefined/null');
    alert('لطفاً ابتدا یک فضای کوچک انتخاب کنید، سپس دستگاه اضافه کنید.');
    return;
  }
  if (currentSmallId.includes('.') || (currentSmallId.length < 36 && !isNaN(currentSmallId))) {
    console.warn(`⚠️ smallId seems temporary: ${currentSmallId}`);
    alert('لطفاً صبر کنید تا فضا کاملاً ذخیره شود، سپس دستگاه اضافه کنید.');
    return;
  }
  try {
    console.log(`✅ Calling store.addDevice with: largeId=${props.largeId}, smallId=${props.smallId}, typeId=${typeId}`);
    const result = await store.addDevice(props.largeId, props.smallId, typeId);
    console.log(`✅ store.addDevice result:`, result);
    if (result) {
      console.log(`✅ Device added successfully: ${result.id}`);
      await store.loadDashboard();
      console.log(`✅ Dashboard refreshed`);
    } else {
      console.warn('⚠️ store.addDevice returned null/false');
      alert('❌ دستگاه اضافه نشد. لطفاً دوباره تلاش کنید.');
    }
  } catch (err) {
    console.error('❌ Error in addDevice:', err);
    alert('❌ خطا در افزودن دستگاه: ' + (err.message || 'خطای ناشناخته'));
  } finally {
    showTypePicker.value = false;
    searchQuery.value = '';
  }
}

async function deleteDevice(deviceId) {
  if (!confirm(t.value.confirmDelete)) return;
  try {
    const res = await dashboardApi.deleteDevice(deviceId);
    if (res?.success) {
      await store.loadDashboard();
      alert('✅ دستگاه حذف شد');
    } else {
      alert('❌ خطا: ' + (res?.message || 'حذف دستگاه ناموفق بود'));
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('❌ خطای ارتباط با سرور: ' + (err.message || ''));
  }
}

// ✅ تابع اصلاح‌شده: خواندن وضعیت مستقیم از آرایه‌ی واقعی
async function toggleChannel(device, channelIndex, event) {
  // ✅ ← ← ← این لاگ باید حتماً در کنسول دیده شود!
  console.log(`🚨 toggleChannel EXECUTED! ch=${channelIndex}`);
  
  // ✅ جلوگیری از propagation (اگر event آمد)
  if (event) {
    event.preventDefault?.();
    event.stopPropagation?.();
  }
  
  // ✅ لاگ تشخیصی اولیه (حتماً باید در کنسول دیده شود!)
  console.log(`🔍 [DIAG] toggleChannel called:`);
  console.log(`   device.id: ${device.id}`);
  console.log(`   device.type: ${device.type}`);
  
  // ✅ ← ← ← حیاتی: تعمیر خودکار channels اگر خالی باشد
  if (!device.channels || !Array.isArray(device.channels) || device.channels.length === 0) {
    let count = 1;
    if (device.type === 'switch2') count = 2;
    else if (device.type === 'switch3') count = 3;
    
    device.channels = Array.from({ length: count }, (_, i) => ({
      id: i,
      label: '',
      status: device.status || false
    }));
    console.log(`🔧 Repaired channels for device ${device.id}: ${count} channels`);
  }
  
  console.log(`   device.channels:`, JSON.stringify(device.channels));
  
  const currentStatus = device.channels?.[channelIndex]?.status ?? false;
  const newStatus = !currentStatus;
  console.log(`   currentStatus: ${currentStatus} → newStatus: ${newStatus}`);
  
  // ✅ جایگزینی کل آرایه برای Reactivity
  const newChannels = [...device.channels];
  newChannels[channelIndex] = { ...newChannels[channelIndex], status: newStatus };
  device.channels = newChannels;
  
  try {
    await store.toggleDeviceStatus(
      props.largeId,
      props.smallId,
      device.id,
      newStatus,
      channelIndex
    );
  } catch (err) {
    console.error('❌ Toggle failed:', err);
    const rollbackChannels = [...device.channels];
    rollbackChannels[channelIndex] = { ...rollbackChannels[channelIndex], status: currentStatus };
    device.channels = rollbackChannels;
  }
}

function openScenarioForDevice(deviceId) {
  scenarioDeviceId.value = deviceId
  showScenarioModal.value = true
}

function closeScenarioModal() {
  scenarioDeviceId.value = null
  showScenarioModal.value = false
}

function handleDeleteScenario(scenarioId) {
  if (scenarioDeviceId.value) store.deleteScenario(scenarioDeviceId.value, scenarioId)
}

function onDevicePaired({ deviceId, token }) {
  console.log('🎉 Device paired:', { deviceId, token })
}

function onDeviceReset() {
  console.log('🗑️ Device reset')
}

async function renameDevice(device) {
  const value = prompt(
    store.lang === 'fa' ? 'نام جدید دستگاه' :
    store.lang === 'en' ? 'New device name' : 'اسم الجهاز الجديد',
    device.name
  )
  if (!value?.trim()) return
  device.name = value.trim()
  await saveDevice(device)
}
</script>

<style scoped>
/* استایل‌های شما بدون تغییر */
.devices-page { padding: 20px; padding-top: 90px; max-width: 700px; margin: 0 auto; }
.page-title { font-size: 22px; margin-bottom: 4px; text-align: center; font-weight: 700; color: rgba(255,255,255,0.9); }
.location-path { text-align: center; opacity: 0.6; font-size: 13px; margin-bottom: 24px; color: rgba(255,255,255,0.7); }
.add-device-section { position: relative; margin-bottom: 24px; }
.btn-add { width: 100%; padding: 14px; background: rgba(34,211,238,0.15); border: 1px dashed rgba(34,211,238,0.4); color: #22d3ee; border-radius: 14px; font-size: 15px; cursor: pointer; }
.btn-add:active { transform: scale(0.98); }
.type-picker-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.type-picker { background: rgba(20,30,45,0.98); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); max-width: 450px; width: 100%; max-height: 80vh; overflow-y: auto; }
.type-picker-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.btn-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7; }
.type-search { width: 100%; padding: 10px 14px; margin-bottom: 16px; border-radius: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 14px; outline: none; }
.type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.type-item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 10px; background: rgba(255,255,255,0.08); border-radius: 14px; cursor: pointer; transition: 0.2s; }
.type-item:hover { border-color: rgba(34,211,238,0.4); background: rgba(34,211,238,0.1); }
.devices-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.device-card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 12px; display: flex; flex-direction: column; gap: 12px; position: relative; }
.device-header { display: flex; align-items: center; gap: 8px; }
.device-name { flex: 1; background: transparent; border: none; color: white; font-size: 13px; font-weight: 500; outline: none; }
.device-controls { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.channel-toggle { display: flex; align-items: center; gap: 8px; }

.toggle {
  position: relative;
  width: 42px;
  height: 22px;
  z-index: 2;
  cursor: pointer;
}

.toggle input {
  display: none;
}

.toggle-slider {
  pointer-events: none; /* ← ← ← این خط مهم است */
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.2);
  border-radius: 999px;
  transition: .3s;
  cursor: pointer;
  z-index: 1;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: .3s;
}

input:checked + .toggle-slider {
  background: #22d3ee;
}

input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 12px;
  opacity: 0.8;
  cursor: pointer;
}
</style>