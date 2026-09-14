<template>
  <div class="login-container">
    <div class="login-box">
      <h2>ورود به خانه هوشمند</h2>

      <form @submit.prevent="handleLogin" v-if="!showMfa && !isLoggedIn">
        <div class="form-group">
          <label>ایمیل</label>
          <input type="email" v-model="email" required placeholder="example@gmail.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label>رمز عبور</label>
          <input type="password" v-model="password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn-primary">ورود</button>
      </form>

      <form @submit.prevent="verifyMfa" v-else-if="showMfa">
        <div class="form-group">
          <label>کد احراز هویت (TOTP)</label>
          <input type="text" v-model="mfaCode" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="123456" autocomplete="one-time-code" />
        </div>
        <button type="submit" class="btn-primary">تأیید و ورود</button>
        <button type="button" @click="cancelMfa" class="btn-secondary">بازگشت</button>
      </form>

      <div v-if="isLoggedIn" class="mfa-setup">
        <h3>تنظیمات امنیتی</h3>
        <p>کاربر گرامی: {{ userEmail }}</p>

        <div v-if="!userMfaEnabled">
          <button @click="setupMfa" class="btn-warning">فعال‌سازی احراز هویت دو مرحله‌ای</button>
        </div>
        <p v-else class="success-text">احراز هویت دو مرحله‌ای فعال است ✅</p>

        <div v-if="qrCodeUrl" class="qr-section">
          <p>این کد را با اپلیکیشن Google Authenticator اسکن کنید:</p>
          <qrcode-vue :value="qrCodeUrl" :size="200" level="H" />
          <input type="text" v-model="mfaVerifyCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="کد ۶ رقمی اپلیکیشن را وارد کنید" autocomplete="one-time-code" />
          <button @click="confirmMfa" class="btn-primary">تأیید نهایی</button>
        </div>

        <button @click="logout" class="btn-secondary" style="margin-top: 20px;">خروج</button>
      </div>

      <hr v-if="!isLoggedIn && !showMfa" />

      <button v-if="!isLoggedIn && !showMfa" @click="loginWithGoogle" class="btn-google">
        <img src="https://www.google.com/favicon.ico" alt="G" />
        ورود با حساب گوگل
      </button>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

export default {
  name: 'LoginPage',
  components: { QrcodeVue },
  setup() {
    const router = useRouter()
    const email = ref('')
    const password = ref('')
    const mfaCode = ref('')
    const mfaVerifyCode = ref('')
    const showMfa = ref(false)
    const error = ref('')
    const isLoggedIn = ref(false)
    const userMfaEnabled = ref(false)
    const userEmail = ref('')
    const qrCodeUrl = ref('')
    const tempToken = ref('')

    const authHeaders = (token) => ({ Authorization: `Bearer ${token}` })

    const handleLogin = async () => {
      error.value = ''
      try {
        const res = await axios.post(`${API_URL}/auth/login`, { email: email.value, password: password.value })
        if (res.data.mfaRequired) {
          tempToken.value = res.data.token
          showMfa.value = true
          return
        }

        localStorage.setItem('token', res.data.token)
        router.push('/dashboard')
      } catch (err) {
        error.value = err.response?.data?.message || 'خطا در ورود'
      }
    }

    const verifyMfa = async () => {
      error.value = ''
      try {
        const res = await axios.post(`${API_URL}/auth/mfa/verify-login`, { token: mfaCode.value }, {
          headers: authHeaders(tempToken.value)
        })
        localStorage.setItem('token', res.data.token)
        tempToken.value = ''
        showMfa.value = false
        router.push('/dashboard')
      } catch (err) {
        error.value = err.response?.data?.message || 'کد نامعتبر است'
      }
    }

    const cancelMfa = () => {
      tempToken.value = ''
      mfaCode.value = ''
      showMfa.value = false
      error.value = ''
    }

    const loginWithGoogle = () => {
      window.location.href = `${API_URL}/auth/google`
    }

    const setupMfa = async () => {
      const token = localStorage.getItem('token')
      error.value = ''
      try {
        const res = await axios.get(`${API_URL}/auth/mfa/setup`, { headers: authHeaders(token) })
        qrCodeUrl.value = res.data.qrCodeUrl
        userMfaEnabled.value = false
      } catch (err) {
        error.value = err.response?.data?.message || 'خطا در دریافت کد QR'
      }
    }

    const confirmMfa = async () => {
      const token = localStorage.getItem('token')
      error.value = ''
      try {
        await axios.post(`${API_URL}/auth/mfa/verify`, { token: mfaVerifyCode.value }, { headers: authHeaders(token) })
        userMfaEnabled.value = true
        qrCodeUrl.value = ''
        mfaVerifyCode.value = ''
      } catch (err) {
        error.value = err.response?.data?.message || 'کد تأیید اشتباه است'
      }
    }

    const logout = async () => {
      const token = localStorage.getItem('token')
      try {
        if (token) await axios.post(`${API_URL}/auth/logout`, {}, { headers: authHeaders(token) })
      } finally {
        localStorage.removeItem('token')
        localStorage.removeItem('temp_token')
        isLoggedIn.value = false
        userMfaEnabled.value = false
        qrCodeUrl.value = ''
        router.push('/login')
      }
    }

    const checkUserStatus = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await axios.get(`${API_URL}/auth/me`, { headers: authHeaders(token) })
        const user = res.data.user
        isLoggedIn.value = true
        userEmail.value = user.email
        userMfaEnabled.value = Boolean(user.isMfaEnabled)
      } catch {
        localStorage.removeItem('token')
        isLoggedIn.value = false
      }
    }

    onMounted(async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tokenParam = urlParams.get('token')
      if (tokenParam) {
        localStorage.setItem('token', tokenParam)
        window.history.replaceState({}, document.title, '/login')
      }
      await checkUserStatus()
    })

    return {
      email, password, mfaCode, mfaVerifyCode, showMfa, error,
      isLoggedIn, userMfaEnabled, userEmail, qrCodeUrl,
      handleLogin, verifyMfa, cancelMfa, loginWithGoogle, setupMfa, confirmMfa, logout
    }
  }
}
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5; }
.login-box { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
.form-group { margin-bottom: 1rem; text-align: left; }
.form-group label { display: block; margin-bottom: 0.5rem; color: #333; }
.form-group input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.btn-primary { width: 100%; padding: 0.75rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem; }
.btn-secondary { width: 100%; padding: 0.75rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 0.5rem; }
.btn-warning { width: 100%; padding: 0.75rem; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem; }
.btn-google { width: 100%; padding: 0.75rem; background: white; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 1rem; }
.btn-google img { width: 20px; }
.error-text { color: red; margin-top: 1rem; font-size: 0.9rem; }
.success-text { color: green; margin-top: 1rem; font-weight: bold; }
.qr-section { margin-top: 1.5rem; border-top: 1px solid #eee; padding-top: 1rem; }
.mfa-setup { margin-top: 2rem; text-align: left; }
</style>
