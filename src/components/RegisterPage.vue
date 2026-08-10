<!-- src/components/RegisterPage.vue -->
<template>
  <div class="auth-container" :style="{ direction: store.lang === 'en' ? 'ltr' : 'rtl' }">
    <div class="auth-card">
      <h2>{{ t.title }}</h2>
      <p class="subtitle">{{ t.subtitle }}</p>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="input-group">
          <label>{{ t.name }}</label>
          <input v-model="form.name" type="text" required :placeholder="t.namePlaceholder" />
        </div>
        
        <div class="input-group">
          <label>{{ t.email }}</label>
          <input v-model="form.email" type="email" required :placeholder="t.emailPlaceholder" />
        </div>
        
        <div class="input-group">
          <label>{{ t.password }}</label>
          <div class="password-wrapper">
            <input v-model="form.password" :type="showPass ? 'text' : 'password'" required :placeholder="t.passPlaceholder" />
            <button type="button" class="toggle-pass" @click="showPass = !showPass">{{ showPass ? '🙈' : '👁️' }}</button>
          </div>
        </div>
        
        <div v-if="errorMsg" class="msg error">{{ errorMsg }}</div>
        
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '⏳' : t.registerBtn }}
        </button>
        
        <div class="auth-links">
          <button type="button" class="link" @click="router.push('/login')">{{ t.login }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store.js'
import { authApi } from '../api/auth.js'
import { resolveAuthError } from '../utils/authErrors.js'

const router = useRouter()
const showPass = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const form = ref({ name: '', email: '', password: '' })

const t = computed(() => ({
  fa: {
    title: '📝 ثبت‌نام',
    subtitle: 'حساب کاربری جدید بسازید',
    name: 'نام و نام خانوادگی',
    namePlaceholder: 'مثال: امیر محمدی',
    email: 'ایمیل',
    emailPlaceholder: 'you@example.com',
    password: 'رمز عبور',
    passPlaceholder: 'حداقل ۸ کاراکتر',
    registerBtn: 'ثبت‌نام',
    login: 'بازگشت به ورود',
    errNetwork: '❌ خطا در اتصال به سرور',
    err400: '❌ اطلاعات وارد شده نامعتبر است',
    err409: '❌ این ایمیل قبلاً ثبت شده است',
    err429: '❌ درخواست‌های زیاد. ۱۵ دقیقه صبر کنید و دوباره تلاش کنید.',
    errServer: '❌ خطای سرور. بک‌اند یا دیتابیس را بررسی کنید.',
    errDefault: '❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.'
  },
  en: {
    title: '📝 Sign Up',
    subtitle: 'Create a new account',
    name: 'Full Name',
    email: 'Email',
    password: 'Password',
    registerBtn: 'Register',
    login: 'Back to Login',
    errNetwork: '❌ Network error',
    err400: '❌ Invalid input data',
    err409: '❌ Email already registered',
    err429: '❌ Too many requests. Wait 15 minutes and try again.',
    errServer: '❌ Server error. Check backend and database.',
    errDefault: '❌ An error occurred'
  }
})[store.lang] || {})

async function handleRegister() {
  loading.value = true
  errorMsg.value = ''
  
  try {
    const res = await authApi.register({
      name: form.value.name,
      email: form.value.email,
      password: form.value.password
    })
    
    if (res.success && res.user) {
      store.setSession(res.user)
      store.setAuthMethod('password')
      await store.loadDashboard()
      router.push('/dashboard')
    } else {
      errorMsg.value = res.message || t.value.errDefault
    }
  } catch (err) {
    errorMsg.value = resolveAuthError(err, t.value)
    console.error('Register error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* کپی استایل‌های LoginPage.vue برای هماهنگی */
.auth-container { 
  min-height: calc(100vh - 60px); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 20px; 
}
.auth-card { 
  background: rgba(255,255,255,0.08); 
  backdrop-filter: blur(16px); 
  border: 1px solid rgba(255,255,255,0.15); 
  border-radius: 24px; 
  padding: 32px; 
  width: 100%; 
  max-width: 400px; 
  box-shadow: 0 20px 50px rgba(0,0,0,0.4); 
}
h2 { text-align: center; font-size: 24px; margin-bottom: 8px; }
.subtitle { text-align: center; opacity: 0.6; margin-bottom: 24px; font-size: 14px; }
.input-group { margin-bottom: 16px; }
label { display: block; font-size: 13px; opacity: 0.8; margin-bottom: 6px; }
input { 
  width: 100%; 
  padding: 12px 14px; 
  border-radius: 12px; 
  border: 1px solid rgba(255,255,255,0.2); 
  background: rgba(255,255,255,0.05); 
  color: white; 
  font-size: 14px; 
  outline: none; 
}
input:focus { border-color: #22d3ee; box-shadow: 0 0 0 3px rgba(34,211,238,0.2); }
.password-wrapper { position: relative; }
.toggle-pass { 
  position: absolute; 
  right: 12px; 
  top: 50%; 
  transform: translateY(-50%); 
  background: none; 
  border: none; 
  font-size: 18px; 
  cursor: pointer; 
}
[dir="rtl"] .toggle-pass { right: auto; left: 12px; }
.btn-primary { 
  width: 100%; 
  padding: 14px; 
  border-radius: 12px; 
  border: none; 
  background: linear-gradient(135deg, #22d3ee, #818cf8); 
  color: #000; 
  font-weight: 700; 
  cursor: pointer; 
  margin-top: 8px; 
}
.btn-primary:disabled { opacity: 0.5; }
.auth-links { 
  display: flex; 
  justify-content: center; 
  margin-top: 20px; 
  font-size: 13px; 
  opacity: 0.7; 
}
.link { 
  background: none; 
  border: none; 
  color: #22d3ee; 
  cursor: pointer; 
  padding: 0; 
}
.msg { 
  padding: 10px; 
  border-radius: 8px; 
  margin-bottom: 16px; 
  font-size: 13px; 
  text-align: center; 
}
.error { background: rgba(239,68,68,0.2); color: #fca5a5; }
</style>