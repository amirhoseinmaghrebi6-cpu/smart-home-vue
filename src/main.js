// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
// ✅ اتصال به Socket.io برای به‌روزرسانی بلادرنگ
import { initSocket } from './store.js'
initSocket()

const app = createApp(App)
app.use(router)
app.mount('#app')
