<!-- src/components/LoginPage.vue -->
<template>
  <div class="auth-container" :style="{ direction: store.lang === 'en' ? 'ltr' : 'rtl' }">
    
    <div class="auth-card">
      
      <h2>{{ t.title }}</h2>
      <p class="subtitle">{{ t.subtitle }}</p>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="input-group">
          <label>{{ t.email }}</label>
          <input 
            v-model="form.email" 
            type="email" 
            required 
            :placeholder="t.emailPlaceholder" 
            autocomplete="username" 
          />
        </div>
        
        <div class="input-group">
          <label>{{ t.password }}</label>
          <div class="password-wrapper">
            <input 
              v-model="form.password" 
              :type="showPass ? 'text' : 'password'" 
              required 
              :placeholder="t.passPlaceholder" 
              autocomplete="current-password" 
            />
            <button type="button" class="toggle-pass" @click="showPass = !showPass">
              {{ showPass ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        
        <!-- ✅ نمایش پیام موفقیت یا خطا به صورت پویا بر اساس زبان -->
        <div v-if="successMsg" class="msg success">{{ successMsg }}</div>
        <div v-else-if="errorMsg" class="msg error">{{ errorMsg }}</div>
        
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '⏳' : t.loginBtn }}
        </button>
        
        <!-- ✅ لینک‌های ثبت‌نام و فراموشی رمز با router.push -->
        <div class="auth-links">
          <button type="button" class="link" @click="goToForgot">{{ t.forgot }}</button>
          <span>|</span>
          <button type="button" class="link" @click="goToRegister">{{ t.register }}</button>
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

// ✅ دیکشنری کامل ترجمه شامل کلیدهای خطا
const t = computed(() => ({
  fa: { 
    title: 'ورود به حساب', 
    subtitle: 'به داشبورد هوشمند خوش آمدید', 
    email: 'ایمیل', 
    password: 'رمز عبور', 
    loginBtn: 'ورود', 
    forgot: 'فراموشی رمز؟', 
    register: 'ثبت‌نام', 
    emailPlaceholder: 'you@example.com', 
    passPlaceholder: '••••••••',
    successMsg: '✅ ورود موفق! در حال انتقال...',
    errNetwork: '❌ خطا در اتصال به سرور',
    err404: '❌ مسیر یافت نشد (سرور در دسترس نیست)',
    err401: '❌ ایمیل یا رمز عبور اشتباه است',
    err429: '❌ درخواست‌های زیاد. ۱۵ دقیقه صبر کنید و دوباره تلاش کنید.',
    errServer: '❌ خطای سرور. بک‌اند یا دیتابیس را بررسی کنید.',
    errDefault: '❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.'
  },
  en: { 
    title: 'Sign In', 
    subtitle: 'Welcome to Smart Dashboard', 
    email: 'Email', 
    password: 'Password', 
    loginBtn: 'Login', 
    forgot: 'Forgot password?', 
    register: 'Sign Up', 
    emailPlaceholder: 'you@example.com', 
    passPlaceholder: '••••••••',
    successMsg: '✅ Login successful! Redirecting...',
    errNetwork: '❌ Network error. Check your connection.',
    err404: '❌ 404: Server endpoint not found.',
    err401: '❌ Invalid email or password.',
    err429: '❌ Too many requests. Wait 15 minutes and try again.',
    errServer: '❌ Server error. Check backend and database.',
    errDefault: '❌ An error occurred. Please try again.'
  },
  ar: { 
    title: 'تسجيل الدخول', 
    subtitle: 'أهلاً بك في لوحة التحكم', 
    email: 'البريد الإلكتروني', 
    password: 'كلمة المرور', 
    loginBtn: 'دخول', 
    forgot: 'نسيت كلمة المرور؟', 
    register: 'حساب جديد', 
    emailPlaceholder: 'you@example.com', 
    passPlaceholder: '••••••••',
    successMsg: '✅ تم الدخول بنجاح! جاري التوجيه...',
    errNetwork: '❌ خطأ في الشبكة. تحقق من اتصالك.',
    err404: '❌ 404: الخادم غير متاح.',
    err401: '❌ البريد أو كلمة المرور غير صحيحة.',
    errDefault: '❌ حدث خطأ. حاول مرة أخرى.'
  }
})[store.lang] || {})

const form = ref({ email: '', password: '' })
const showPass = ref(false)
const loading = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

function goToRegister() {
  router.push('/register').catch(err => console.warn('Nav error:', err))
}

function goToForgot() {
  alert(t.value.errDefault)
}

async function handleLogin() {
  loading.value = true
  successMsg.value = ''
  errorMsg.value = ''
  
  try {
    const res = await authApi.login(form.value.email, form.value.password)
    
    if (res.success && res.user) {
      store.setSession(res.user)
      store.setAuthMethod('password')
      
      successMsg.value = t.value.successMsg
      
      await store.loadDashboard()
      
      setTimeout(() => {
        router.push('/dashboard').catch(err => {
          console.error('Router error:', err)
          errorMsg.value = t.value.errDefault
        })
      }, 800)
    } else {
      errorMsg.value = res.message || t.value.err401
    }
  } catch (err) {
    errorMsg.value = resolveAuthError(err, t.value)
    console.error('Login error details:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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
h2 { 
  text-align: center; 
  font-size: 24px; 
  margin-bottom: 8px; 
}
.subtitle { 
  text-align: center; 
  opacity: 0.6; 
  margin-bottom: 24px; 
  font-size: 14px; 
}
.input-group { 
  margin-bottom: 16px; 
}
label { 
  display: block; 
  font-size: 13px; 
  opacity: 0.8; 
  margin-bottom: 6px; 
}
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
input:focus { 
  border-color: #22d3ee; 
  box-shadow: 0 0 0 3px rgba(34,211,238,0.2); 
}
.password-wrapper { 
  position: relative; 
}
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
[dir="rtl"] .toggle-pass { 
  right: auto; 
  left: 12px; 
}
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
.btn-primary:disabled { 
  opacity: 0.5; 
}
.auth-links { 
  display: flex; 
  justify-content: center; 
  gap: 12px; 
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
.link:hover { 
  text-decoration: underline; 
}
.msg { 
  padding: 10px; 
  border-radius: 8px; 
  margin-bottom: 16px; 
  font-size: 13px; 
  text-align: center; 
}
.error { 
  background: rgba(239,68,68,0.2); 
  color: #fca5a5; 
}
.success { 
  background: rgba(34,197,94,0.2); 
  color: #86efac; 
}
</style>