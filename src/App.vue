<!-- src/App.vue -->
<template>
  <div class="app-root" :style="{ background: currentTheme.bg }">
    
    <!-- ✅ هدر جهانی با پوزیشن‌دهی مطلق -->
    <div class="global-header">
      <NetworkStatus />
      
      <!-- ✅ دکمه بازگشت: همیشه چپ (مستقل از زبان) -->
      <button v-if="showBackBtn" class="back-btn" @click="router.back()">←</button>
      
      <!-- ✅ دکمه تنظیمات: همیشه راست (مستقل از زبان) -->
      <button class="settings-btn" @click.stop="showMenu = !showMenu">⚙️</button>
    </div>

    <!-- ✅ منوی کشویی -->
    <Transition name="menu">
      <div v-if="showMenu" class="dropdown" ref="menuRef" @click.stop>
        <div class="menu-group">
          <div class="menu-group-header" @click="toggleGroup('lang')">
            <span>🌐 {{ t.lang }}</span>
            <span class="arrow">{{ openGroup === 'lang' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="openGroup === 'lang'" class="menu-group-content">
            <button v-for="l in ['fa','en','ar']" :key="l" class="menu-btn" :class="{active: store.lang===l}" @click.stop="store.setLang(l)">
              {{ langNames[l] }}
            </button>
          </div>
        </div>
        <div class="menu-group">
          <div class="menu-group-header" @click="toggleGroup('theme')">
            <span>🎨 {{ t.theme }}</span>
            <span class="arrow">{{ openGroup === 'theme' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="openGroup === 'theme'" class="menu-group-content">
            <button v-for="(th,i) in themes" :key="th.name" class="menu-btn" :class="{active: store.themeIndex===i}" @click.stop="store.setTheme(i)">
              {{ th.name }}
            </button>
          </div>
        </div>
        <div class="menu-group">
          <div class="menu-group-header" @click="toggleGroup('calendar')">
            <span>📅 {{ t.calendar }}</span>
            <span class="arrow">{{ openGroup === 'calendar' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="openGroup === 'calendar'" class="menu-group-content">
            <button v-for="cal in ['shamsi','miladi']" :key="cal" class="menu-btn" :class="{active: store.calendarSystem===cal}" @click.stop="store.setCalendarSystem(cal)">
              {{ cal==='shamsi' ? (store.lang==='fa'?'شمسی':'Shamsi') : (store.lang==='en'?'Gregorian':'Miladi') }}
            </button>
          </div>
        </div>
        <div class="menu-group">
          <div class="menu-group-header" @click="toggleGroup('unit')">
            <span>🌡️ {{ t.tempUnit }}</span>
            <span class="arrow">{{ openGroup === 'unit' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="openGroup === 'unit'" class="menu-group-content">
            <button v-for="u in ['celsius','fahrenheit','kelvin']" :key="u" class="menu-btn" :class="{active: store.tempUnit===u}" @click.stop="store.setTempUnit(u)">
              {{ u==='celsius'?'°C' : u==='fahrenheit'?'°F' : 'K' }}
            </button>
          </div>
        </div>
        <!-- داخل <div class="dropdown"> یا معادل آن -->
<router-link to="/scenarios" class="menu-btn">
  📅 {{ store.lang === 'fa' ? 'سناریوها' : store.lang === 'en' ? 'Scenarios' : 'السيناريوهات' }}
</router-link>

<!-- سپس خط جداکننده یا دکمه‌های بعدی -->
<div class="menu-section-divider"></div>
        <!-- ✅ دکمه شماره‌های اضطراری (با سینتکس صحیح) -->
        <div class="menu-section-divider">
          <button class="menu-btn emergency" @click.stop="goToEmergency()">
            🚨 {{ store.lang === 'fa' ? 'شماره‌های اضطراری' : 'Emergency Contacts' }}
          </button>
        </div>
        
        <!-- ✅ دکمه خروج -->
        <div class="menu-section-divider">
          <button class="menu-btn danger" @click.stop="handleLogout">🚪 {{ t.logout }}</button>
        </div>
      </div>
    </Transition>

    <!-- ✅ محتوای صفحات -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { store } from './store.js'
import NetworkStatus from './components/NetworkStatus.vue'

const router = useRouter()
const route = useRoute()

const themes = [
  {
    name: 'Deep Ocean',
    bg: 'linear-gradient(135deg, #001f3f, #003566, #001219)'
  },
  {
    name: 'DOS',
    bg: 'linear-gradient(135deg, #000814, #001d3d, #003566)'
  },
  {
    name: 'Neon Blue',
    bg: 'linear-gradient(135deg, #001219, #005f73, #00b4d8)'
  },

  // ===== Nature =====
  {
    name: 'Forest Dark',
    bg: 'linear-gradient(135deg, #0b1d13, #1b4332, #2d6a4f)'
  },
  {
    name: 'Nature',
    bg: 'linear-gradient(135deg, #283618, #606c38, #bc6c25)'
  },

  // ===== Warm / Home =====
  {
    name: 'Warm Home',
    bg: 'linear-gradient(135deg, #4e342e, #8d6e63, #d7ccc8)'
  },
  {
    name: 'Coffee',
    bg: 'linear-gradient(135deg, #3e2723, #5d4037, #8d6e63)'
  }
]
const currentTheme = computed(() => themes[store.themeIndex] || themes[0])
const langNames = { fa: 'فارسی', en: 'English', ar: 'العربية' }

const openGroup = ref('lang')
function toggleGroup(g) { openGroup.value = openGroup.value === g ? null : g }

const t = computed(() => ({
  fa: { lang: 'زبان', theme: 'تم', logout: 'خروج', calendar: 'تقویم', tempUnit: 'واحد دما' },
  en: { lang: 'Language', theme: 'Theme', logout: 'Logout', calendar: 'Calendar', tempUnit: 'Temp Unit' },
  ar: { lang: 'اللغة', theme: 'السمة', logout: 'خروج', calendar: 'التقويم', tempUnit: 'وحدة الحرارة' }
})[store.lang])

const showMenu = ref(false)
const menuRef = ref(null)

const showBackBtn = computed(() => route.path !== '/login' && route.path !== '/register')

// ✅ تابع ناوبری به صفحه اضطراری
function goToEmergency() {
  showMenu.value = false // بستن منو
  router.push('/emergency') // رفتن به صفحه
}

async function handleLogout() {
  await store.logout()
  showMenu.value = false
  router.push('/login')
}

function handleClickOutside(e) {
  if (showMenu.value && menuRef.value && !menuRef.value.contains(e.target)) showMenu.value = false
}

onMounted(() => {
  // ✅ فقط زبان را تنظیم می‌کنیم، dir را دستکاری نمی‌کنیم تا لی‌اوت به هم نریزد
  document.documentElement.lang = store.lang
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
body {
  font-family: 'Vazirmatn', system-ui, sans-serif;
  overscroll-behavior-y: none; 
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  color: #ffffff;
}
.app-root { min-height: 100dvh; }

/* هدر جهانی */
.global-header { 
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  height: 60px; 
  display: flex; 
  align-items: center; 
  padding: 0 20px; 
  z-index: 50; 
  pointer-events: none; 
}

/* ✅ دکمه‌ها با پوزیشن مطلق: کاملاً مستقل از زبان */
.back-btn, .settings-btn { 
  pointer-events: auto; 
  width: 44px; 
  height: 44px; 
  border-radius: 50%; 
  background: rgba(255,255,255,0.15); 
  border: 1px solid rgba(255,255,255,0.3); 
  color: white; 
  font-size: 20px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  backdrop-filter: blur(10px); 
  transition: 0.2s; 
  position: absolute; /* ✅ کلید حل مشکل: حذف وابستگی به flex/dir */
  top: 8px;
}

/* ✅ دکمه بازگشت: همیشه چپ */
.back-btn { left: 20px; }

/* ✅ دکمه تنظیمات: همیشه راست */
.settings-btn { right: 20px; }

.back-btn:active { transform: scale(0.9); }
.settings-btn:active { transform: scale(0.9) rotate(30deg); }

/* منوی کشویی */
.menu-enter-active, .menu-leave-active { transition: 0.2s ease; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: scale(0.95) translateY(-10px); }
.dropdown { 
  position: fixed; 
  top: 70px; 
  right: 20px; 
  background: rgba(20,30,45,0.95); 
  backdrop-filter: blur(16px); 
  border: 1px solid rgba(255,255,255,0.2); 
  border-radius: 18px; 
  padding: 12px; 
  width: 220px; 
  z-index: 99; 
  box-shadow: 0 12px 30px rgba(0,0,0,0.5); 
}
.menu-group { margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
.menu-group:last-of-type { border-bottom: none; }
.menu-group-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: #cbd5e1; }
.menu-group-content { display: flex; flex-direction: column; gap: 6px; padding: 8px 0 4px 6px; }
.menu-btn { width: 100%; padding: 8px 12px; border-radius: 8px; background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.7); font-size: 13px; cursor: pointer; text-align: right; }
.menu-btn.active { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.2); color: white; font-weight: 600; }
.menu-btn.emergency { 
  background: rgba(239,68,68,0.15); 
  border-color: rgba(239,68,68,0.3); 
  color: #f87171; 
  font-weight: 600;
}
.menu-btn.emergency:hover { 
  background: rgba(239,68,68,0.25); 
}
.menu-btn.danger { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.3); color: #f87171; margin-top: 4px; }
.menu-section-divider { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 6px; padding-top: 6px; }

/* محتوای اصلی */
.main-content { flex: 1; padding-top: 60px; width: 100%; }
</style>