<!-- src/components/Dashboard.vue -->
<template>
  <div class="dashboard" :style="{ direction: store.lang === 'en' ? 'ltr' : 'rtl' }">
    <h1 class="page-title">{{ t.title }}</h1>
    <p v-if="store.currentUser" class="welcome">{{ t.welcome }}, {{ store.currentUser.name }}</p>
    
    <button class="btn-add" @click="addLocation('large')">
      <SmartIcon emoji="➕" :size="20" class="btn-icon-inner" /> {{ t.addLarge }}
    </button>

    <div v-if="store.locations.length === 0" class="empty-state">
      {{ t.empty }}
    </div>

    <div class="locations-list">
      <div v-for="loc in store.locations" :key="loc.id" class="location-card">
        <div class="loc-header">
          <div class="loc-img-wrapper" @click="changeImage(loc, null)">
            <img :src="loc.image || placeholderImg" class="loc-img" alt="cover" />
            <SmartIcon emoji="📷" :size="32" class="img-overlay-icon" />
          </div>
          <div class="loc-info">
            <input v-model="loc.name" class="loc-name" :placeholder="t.largePlaceholder" @blur="saveLocation(loc)" />
            <span class="loc-type">{{ t.large }}</span>
          </div>
          <button class="btn-icon danger" @click="deleteLocation(loc.id)" :title="t.delete">
            <SmartIcon emoji="🗑" :size="20" />
          </button>
        </div>

        <div class="rooms-section">
          <div class="rooms-header">
            <span class="rooms-title">{{ t.smallPlaces }}</span>
            <button class="btn-add-small" @click="addLocation('small', loc.id)">
              <SmartIcon emoji="➕" :size="16" class="btn-icon-inner" /> {{ t.addSmall }}
            </button>
          </div>
          
          <div class="rooms-grid">
            <div 
              v-for="room in (loc.children || [])" 
              :key="room.id" 
              class="room-item"
              :data-room-id="room.id"
              @click="openDevices(loc.id, room.id)" 
            >
              <!-- ✅ منوی عمودی گوشه‌ی کارت -->
              <div class="room-menu-wrapper">
                <button class="room-menu-btn" @click.stop="toggleRoomMenu(room.id, $event)" :title="t.roomOptions">
                  ⋮
                </button>
                
                <Transition name="slide">
                  <div 
                    v-if="openRoomMenuId === room.id" 
                    class="room-dropdown"
                    ref="menuRef"
                    @click.stop
                  >
                    <button class="dropdown-item" @click.stop="handleRoomAction(room, 'rename', loc.id)">
                      ✏️ {{ t.rename }}
                    </button>
                    <button class="dropdown-item" @click.stop="handleRoomAction(room, 'change-image', loc.id)">
                      📷 {{ t.changeImage }}
                    </button>
                    <button class="dropdown-item danger" @click.stop="handleRoomAction(room, 'delete', loc.id)">
                      🗑️ {{ t.delete }}
                    </button>
                  </div>
                </Transition>
              </div>

              <!-- ✅ محتوای کارت (کلیک = رفتن به صفحه دستگاه‌ها) -->
              <div class="room-content">
                <div class="room-img-wrapper">
                  <img :src="room.image || placeholderImg" class="room-img" alt="room" />
                  <SmartIcon emoji="📷" :size="26" class="img-overlay-icon" />
                </div>
                <div class="room-name-display">{{ room.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <input type="file" accept="image/*" hidden ref="fileInput" @change="handleFileChange" />
  </div>


</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { compressImage } from '../utils/imageCompressor.js'
import SmartIcon from './SmartIcon.vue'
import { useRouter } from 'vue-router'
import apiClient from '../api/apiClient.js'

const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNCIvPjwvc3ZnPg=='
const fileInput = ref(null)
let pendingTarget = null

// ✅ متغیرهای جدید برای مدیریت منوی اتاق
const openRoomMenuId = ref(null)
const menuRef = ref(null)

const t = computed(() => ({
  fa: { 
    title: 'داشبورد', welcome: 'خوش آمدید', addLarge: 'افزودن مکان', empty: 'هنوز مکانی تعریف نشده', 
    large: 'مکان اصلی', largePlaceholder: 'نام مکان (مثلاً خانه)', smallPlaces: 'فضاهای داخلی', 
    addSmall: 'افزودن فضا', smallPlaceholder: 'نام فضا (مثلاً آشپزخانه)', delete: 'حذف',
    newLocation: 'مکان جدید', newSpace: 'فضای جدید',
    roomOptions: 'گزینه‌های فضا', rename: 'تغییر نام', changeImage: 'تغییر عکس'
  },
  en: { 
    title: 'Dashboard', welcome: 'Welcome', addLarge: 'Add Location', empty: 'No locations yet', 
    large: 'Main Location', largePlaceholder: 'Location Name (e.g. Home)', smallPlaces: 'Rooms', 
    addSmall: 'Add Room', smallPlaceholder: 'Room Name (e.g. Kitchen)', delete: 'Delete',
    newLocation: 'New Location', newSpace: 'New Space',
    roomOptions: 'Room Options', rename: 'Rename', changeImage: 'Change Image'
  },
  ar: { 
    title: 'لوحة التحكم', welcome: 'أهلاً بك', addLarge: 'إضافة موقع', empty: 'لا توجد مواقع بعد', 
    large: 'الموقع الرئيسي', largePlaceholder: 'اسم الموقع', smallPlaces: 'الغرف', 
    addSmall: 'إضافة غرفة', smallPlaceholder: 'اسم الغرفة', delete: 'حذف',
    newLocation: 'موقع جديد', newSpace: 'فضاء جديد',
    roomOptions: 'خيارات الغرفة', rename: 'إعادة تسمية', changeImage: 'تغيير الصورة'
  }
})[store.lang])

function addLocation(type, parentId = null) {
  const defaultName = type === 'large' ? t.value.newLocation : t.value.newSpace
  store.addLocation(type, parentId, { name: defaultName }).catch(err => {
    console.error('Failed to add location:', err)
    alert(store.lang === 'fa' ? '❌ ذخیره مکان ناموفق بود. دوباره تلاش کنید.' : '❌ Failed to save location.')
  })
}

const confirmMsgs = computed(() => {
  const msgs = {
    fa: { location: 'آیا از حذف این مکان و تمام زیرمجموعه‌های آن مطمئنید؟', room: 'آیا از حذف این فضا مطمئنید؟' },
    en: { location: 'Are you sure you want to delete this location and all its subspaces?', room: 'Are you sure you want to delete this room?' },
    ar: { location: 'هل أنت متأكد من حذف هذا الموقع وجميع مساحاته الفرعية؟', room: 'هل أنت متأكد من حذف هذه الغرفة؟' }
  }
  return msgs[store.lang] || msgs.en
})

function deleteLocation(id) {
  if (confirm(confirmMsgs.value.location)) store.deleteLocation(id)
}

function deleteChild(parentId, childId) {
  if (confirm(confirmMsgs.value.room)) store.deleteChild(parentId, childId)
}

function changeImage(target, parentId = null) {
  pendingTarget = { target, parentId }
  fileInput.value.click()
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file || !pendingTarget) return
  try {
    const compressedBase64 = await compressImage(file, 150, 150, 0.75)
    if (pendingTarget.parentId) {
      store.updateChild(pendingTarget.parentId, pendingTarget.target.id, { image: compressedBase64 })
    } else {
      store.updateLocation(pendingTarget.target.id, { image: compressedBase64 })
    }
  } catch (err) {
    console.error('خطا در فشرده‌سازی تصویر:', err)
    alert('خطا در پردازش تصویر.')
  } finally {
    e.target.value = ''
    pendingTarget = null
  }
}
const router = useRouter()
function saveLocation(loc) {
  if (loc?.id && loc?.name) {
    store.updateLocation(loc.id, { name: loc.name.trim() })
  }
}
function openDevices(largeId, smallId) {
  // ✅ اول ناوبری را با vue-router انجام بده
  router.push({ 
    name: 'Devices',  // 👈 نام روت باید در router/index.js تعریف شده باشد
    params: { largeId, smallId }
  }).catch(err => {
    console.warn('Navigation error:', err)
    // اگر روت پیدا نشد، مسیر جایگزین را امتحان کن
    router.push(`/devices/${largeId}/${smallId}`).catch(e => {
      console.error('Fallback navigation failed:', e)
    })
  })
  
  // ✅ سپس (اختیاری) داده‌ها را از بک‌اند رفرش کن
  fetchDevicesForRoom(largeId, smallId).catch(err => {
    console.error('Background fetch failed:', err)
  })
}

// ✅ تابع جدید: دریافت دستگاه‌ها از بک‌اند
async function fetchDevicesForRoom(largeId, smallId) {
  try {
    const response = await apiClient.get('/user/devices')
    if (response.data.success) {
      await store.loadDashboard()
    }
  } catch (err) {
    console.error('❌ Failed to fetch devices:', err)
  }
}
// ✅ توابع مدیریت منوی اتاق
function toggleRoomMenu(roomId, event) {
  event.stopPropagation()
  openRoomMenuId.value = openRoomMenuId.value === roomId ? null : roomId
}

function closeRoomMenu() {
  openRoomMenuId.value = null
}

function handleClickOutside(event) {
  if (openRoomMenuId.value && menuRef.value && !menuRef.value.contains(event.target)) {
    closeRoomMenu()
  }
}

function handleRoomAction(room, action, locationId) {
  closeRoomMenu()
  
  if (action === 'delete') {
    if (confirm(store.lang === 'fa' ? 'آیا از حذف این فضا مطمئنید؟' : 'Are you sure you want to delete this room?')) {
      store.deleteChild(locationId, room.id)
    }
  } 
  // ✅ بخش تغییر نام با استفاده از prompt
  else if (action === 'rename') {
    const labels = {
      fa: { prompt: 'نام جدید فضا را وارد کنید:', cancel: 'تغییر نام لغو شد' },
      en: { prompt: 'Enter new room name:', cancel: 'Rename cancelled' },
      ar: { prompt: 'أدخل اسم الغرفة الجديد:', cancel: 'تم إلغاء إعادة التسمية' }
    }
    const txt = labels[store.lang] || labels.en
    
    const newName = prompt(txt.prompt, room.name)
    
    // اگر کاربر نام جدید وارد کرد و Cancel نزد
    if (newName !== null && newName.trim()) {
      store.updateChild(locationId, room.id, { name: newName.trim() })
    }
  } 
  else if (action === 'change-image') {
    changeImage(room, locationId)
  }
}

onMounted(() => { document.addEventListener('click', handleClickOutside) })
onUnmounted(() => { document.removeEventListener('click', handleClickOutside) })
</script>

<style scoped>
.dashboard { padding: 20px; padding-top: 90px; max-width: 800px; margin: 0 auto; }
.page-title { font-size: 24px; margin-bottom: 4px; text-align: center; font-weight: 700; color: #ffffff;}
.welcome { text-align: center; opacity: 0.7; font-size: 14px; margin-bottom: 24px; color: rgba(255,255,255,0.7);}
.btn-add { width: 100%; padding: 14px; background: rgba(34,211,238,0.15); border: 1px dashed rgba(34,211,238,0.4); color: #22d3ee; border-radius: 14px; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px; }
.btn-add:active { transform: scale(0.98); }
.empty-state { text-align: center; opacity: 0.5; padding: 40px; font-size: 15px; }
.locations-list { display: flex; flex-direction: column; gap: 20px; }
.location-card { position: relative; overflow: visible; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 16px; }
.loc-header { display: flex; gap: 12px; align-items: center; }
.loc-img-wrapper { position: relative; width: 80px; height: 80px; border-radius: 14px; overflow: hidden; cursor: pointer; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.2); }
.loc-img { width: 100%; height: 100%; object-fit: cover; }
.img-overlay-icon { 
  position: absolute; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%); 
  color: white; 
  opacity: 0.85; 
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); 
  pointer-events: none; 
}
.loc-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.loc-name { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.2); color: white; font-size: 16px; font-weight: 600; padding: 4px 0; outline: none; }
.loc-type { font-size: 11px; opacity: 0.5; color: rgba(255,255,255,0.6);}
.btn-icon { flex-shrink: 0; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; }
@media (max-width: 480px) {
  .loc-header { gap: 8px; }
  .btn-icon { width: 28px; height: 28px; }
  .loc-img-wrapper { width: 60px; height: 60px; }
  .loc-name { font-size: 14px; }
}
.btn-icon:hover { background: rgba(255,255,255,0.2); }
.btn-icon.danger { color: #f87171; }
.btn-icon.danger:hover { background: rgba(239,68,68,0.2); }
.rooms-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.rooms-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.rooms-title { font-size: 13px; opacity: 0.6; font-weight: 500; color: rgba(255,255,255,0.7);}
.btn-add-small { background: rgba(255,255,255,0.1); border: none; color: white; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.btn-add-small:hover { background: rgba(255,255,255,0.2); }
.rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 12px; }

/* ✅ استایل‌های جدید کارت اتاق */
.room-item { 
  background: rgba(0,0,0,0.2); 
  border-radius: 14px; 
  padding: 14px 10px 16px; /* ✅ پدینگ عمودی بیشتر */
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 12px; /* ✅ فاصله‌ی بیشتر بین عکس و نام */
  cursor: pointer; 
  transition: 0.2s; 
  border: 1px solid transparent; 
  position: relative;
  min-height: 150px; /* ✅ ارتفاع حداقل بیشتر */
}
.room-item:hover { border-color: rgba(34,211,238,0.3); background: rgba(34,211,238,0.05); }
/* ✅ عکس کارت */
.room-img-wrapper { 
  position: relative; 
  width: 75px;  
  height: 75px; /* ✅ مقدار جا افتاده اضافه شد */
  border-radius: 12px; 
  overflow: hidden; 
  border: 1px solid rgba(255,255,255,0.1); 
  margin-top: 8px;    /* ✅ فاصله از بالای کارت (به جای top) */
  margin-bottom: 12px; /* ✅ فاصله از نام کارت (حل مشکل چسبیدن) */
}
.room-img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
}
.room-name { display: none; } /* مخفی کردن اینپوت قدیمی */

/* ✅ منوی اتاق */
.room-menu-wrapper { position: absolute; top: 10px; left: 10px; z-index: 15; }
[dir="rtl"] .room-menu-wrapper { left: auto; right: 10px; }
.room-menu-btn {
  width: 28px; height: 28px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.2);
  color: white; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: 0.2s; backdrop-filter: blur(4px);
}
.room-menu-btn:hover { background: rgba(255, 255, 255, 0.2); }
.room-dropdown {
  position: absolute; top: 36px; left: 0;
  background: rgba(20, 30, 45, 0.98); border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px; padding: 6px; min-width: 140px; z-index: 20;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex; flex-direction: column; gap: 4px;
}
[dir="rtl"] .room-dropdown { left: auto; right: 0; }
.dropdown-item {
  width: 100%; padding: 8px 12px; border-radius: 6px;
  background: transparent; border: none; color: rgba(255, 255, 255, 0.9);
  text-align: start; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: 0.2s;
}
.dropdown-item:hover { background: rgba(255, 255, 255, 0.1); }
.dropdown-item.danger { color: #f87171; }

/* ✅ محتوای کارت برای کلیک */
/* ✅ کانتینر محتوای کارت */
.room-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0; /* ✅ gap را صفر می‌کنیم چون فاصله را با margin-bottom عکس مدیریت می‌کنیم */
  width: 100%;
  cursor: pointer;
  padding: 0 4px 4px;
}
.room-content:active { transform: scale(0.98); transition: 0.1s; }
.room-name-display {
  width: 100%; 
  text-align: center; 
  font-size: 12px; /* ✅ از 12px به 14px */
  font-weight: 600; /* ✅ کمی بولدتر */
  color: white; 
  opacity: 0.95; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  padding: 6px 10px; /* ✅ پدینگ بیشتر */
  border-radius: 8px; 
  transition: 0.2s;
  line-height: 1.4; /* ✅ فاصله‌ی خطوط بهتر */
}
.room-item:hover .room-name-display { 
  background: rgba(34, 211, 238, 0.1); 
  color: #22d3ee; 
}

/* ✅ انیمیشن منو */
.slide-enter-active, .slide-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>