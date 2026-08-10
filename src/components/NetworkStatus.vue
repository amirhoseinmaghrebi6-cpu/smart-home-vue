<!-- src/components/NetworkStatus.vue -->
<template>
  <Transition name="slide-down">
    <div v-if="!isOnline" class="network-banner">
      <span class="icon">📡</span>
      <span class="text">{{ t.offline }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { store } from '../store.js'

const isOnline = ref(navigator.onLine)

const t = computed(() => ({
  fa: { offline: 'اتصال به شبکه قطع است. برخی قابلیت‌ها در دسترس نیستند.' },
  en: { offline: 'Network disconnected. Some features may be unavailable.' },
  ar: { offline: 'انقطاع الاتصال بالشبكة. قد لا تكون بعض الميزات متاحة.' }
})[store.lang])

function updateStatus() { isOnline.value = navigator.onLine }

onMounted(() => {
  window.addEventListener('online', updateStatus)
  window.addEventListener('offline', updateStatus)
})
onUnmounted(() => {
  window.removeEventListener('online', updateStatus)
  window.removeEventListener('offline', updateStatus)
})
</script>

<style scoped>
.network-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: rgba(239, 68, 68, 0.9);
  backdrop-filter: blur(8px);
  color: white;
  text-align: center;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); }
</style>