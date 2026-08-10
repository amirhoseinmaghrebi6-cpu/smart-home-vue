<template>
  <div class="auth-container" :style="{ direction: store.lang === 'en' ? 'ltr' : 'rtl' }">
    <div class="auth-card">
      <h2>{{ t.title }}</h2>
      <p class="subtitle">{{ t.subtitle }}</p>
      <form @submit.prevent="handleForgot" class="auth-form">
        <div class="input-group"><label>{{ t.email }}</label><input v-model="form.email" type="email" required :placeholder="t.emailPlaceholder" /></div>
        <div v-if="message" :class="['msg', isError ? 'error' : 'success']">{{ message }}</div>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? '⏳' : t.sendBtn }}</button>
        <div class="auth-links"><button type="button" class="link" @click="router.push('/login')">← {{ t.back }}</button></div>
      </form>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store.js'
import { authApi } from '../api/auth.js'

const router = useRouter()
const t = computed(() => ({
  fa: { title: 'بازیابی رمز عبور', subtitle: 'ایمیل خود را وارد کنید تا لینک بازیابی ارسال شود', email: 'ایمیل', sendBtn: 'ارسال لینک بازیابی', back: 'بازگشت به ورود', emailPlaceholder: 'you@example.com' },
  en: { title: 'Reset Password', subtitle: 'Enter your email to receive a reset link', email: 'Email', sendBtn: 'Send Reset Link', back: 'Back to Login', emailPlaceholder: 'you@example.com' },
  ar: { title: 'إعادة تعيين كلمة المرور', subtitle: 'أدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين', email: 'البريد الإلكتروني', sendBtn: 'إرسال الرابط', back: 'العودة لتسجيل الدخول', emailPlaceholder: 'you@example.com' }
})[store.lang])
const form = ref({ email: '' }); const loading = ref(false); const message = ref(''); const isError = ref(false)
async function handleForgot() {
  loading.value = true; message.value = ''
  try {
    await authApi.forgotPassword(form.value.email)
    isError.value = false; message.value = '✅ لینک بازیابی به ایمیل شما ارسال شد (شبیه‌سازی)'
  } catch (e) { isError.value = true; message.value = e.message }
  finally { loading.value = false }
}
</script>
<style scoped>
/* استایل‌ها دقیقاً مشابه RegisterPage.vue هستند برای یکدستی */
.auth-container { min-height: calc(100vh - 60px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { background: rgba(255,255,255,0.08); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 32px; width: 100%; max-width: 400px; }
h2 { text-align: center; font-size: 24px; margin-bottom: 8px; }
.subtitle { text-align: center; opacity: 0.6; margin-bottom: 24px; font-size: 14px; }
.input-group { margin-bottom: 16px; }
label { display: block; font-size: 13px; opacity: 0.8; margin-bottom: 6px; }
input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white; font-size: 14px; outline: none; }
input:focus { border-color: #22d3ee; box-shadow: 0 0 0 3px rgba(34,211,238,0.2); }
.btn-primary { width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #22d3ee, #818cf8); color: #000; font-weight: 700; cursor: pointer; margin-top: 8px; }
.btn-primary:disabled { opacity: 0.5; }
.auth-links { display: flex; justify-content: center; gap: 12px; margin-top: 20px; font-size: 13px; opacity: 0.7; }
.link { background: none; border: none; color: #22d3ee; cursor: pointer; padding: 0; }
.msg { padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; text-align: center; }
.error { background: rgba(239,68,68,0.2); color: #fca5a5; }
.success { background: rgba(34,197,94,0.2); color: #86efac; }
</style>