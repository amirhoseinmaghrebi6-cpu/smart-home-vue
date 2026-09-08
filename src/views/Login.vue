<template>
  <div class="login-container">
    <div class="login-box">
      <h2>ورود به خانه هوشمند</h2>

      <!-- فرم لاگین معمولی -->
      <form @submit.prevent="handleLogin" v-if="!showMfa && !isLoggedIn">
        <div class="form-group">
          <label>ایمیل</label>
          <input type="email" v-model="email" required placeholder="example@gmail.com" />
        </div>
        <div class="form-group">
          <label>رمز عبور</label>
          <input type="password" v-model="password" required />
        </div>
        <button type="submit" class="btn-primary">ورود</button>
      </form>

      <!-- فرم وارد کردن کد MFA -->
      <form @submit.prevent="verifyMfa" v-else-if="showMfa">
        <div class="form-group">
          <label>کد احراز هویت (TOTP)</label>
          <input type="text" v-model="mfaCode" required placeholder="123456" maxlength="6" />
        </div>
        <button type="submit" class="btn-primary">تأیید و ورود</button>
        <button @click="showMfa = false" class="btn-secondary">بازگشت</button>
      </form>

      <!-- پنل تنظیمات امنیتی برای کاربران وارد شده -->
      <div v-if="isLoggedIn" class="mfa-setup">
        <h3>تنظیمات امنیتی</h3>
        <p>کاربر گرامی: {{ userEmail }}</p>
        
        <div v-if="!userMfaEnabled">
          <button @click="setupMfa" class="btn-warning">فعال‌سازی احراز هویت دو مرحله‌ای</button>
        </div>
        <p v-else class="success-text">احراز هویت دو مرحله‌ای فعال است ✅</p>

        <!-- نمایش QR Code -->
        <div v-if="qrCodeUrl" class="qr-section">
          <p>این کد را با اپلیکیشن Google Authenticator اسکن کنید:</p>
          <qrcode-vue :value="qrCodeUrl" :size="200" level="H" />
          <input type="text" v-model="mfaVerifyCode" placeholder="کد ۶ رقمی اپلیکیشن را وارد کنید" />
          <button @click="confirmMfa" class="btn-primary">تأیید نهایی</button>
        </div>
        
        <button @click="logout" class="btn-secondary" style="margin-top: 20px;">خروج</button>
      </div>

      <hr v-if="!isLoggedIn" />

      <!-- دکمه ورود با گوگل (فقط اگر لاگین نیست) -->
      <button v-if="!isLoggedIn" @click="loginWithGoogle" class="btn-google">
        <img src="https://www.google.com/favicon.ico" alt="G" />
        ورود با حساب گوگل
      </button>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import QrcodeVue from 'qrcode.vue';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export default {
  name: 'LoginPage',
  components: { QrcodeVue },
  setup() {
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const mfaCode = ref('');
    const mfaVerifyCode = ref('');
    const showMfa = ref(false);
    const error = ref('');
    const isLoggedIn = ref(false);
    const userMfaEnabled = ref(false);
    const userEmail = ref('');
    const qrCodeUrl = ref('');
    const tempToken = ref(localStorage.getItem('temp_token') || '');

    const handleLogin = async () => {
      try {
        const res = await axios.post(\\/auth/login\, { email: email.value, password: password.value });
        if (res.data.mfaRequired) {
          tempToken.value = res.data.token;
          localStorage.setItem('temp_token', res.data.token);
          showMfa.value = true;
          error.value = '';
        } else {
          localStorage.setItem('token', res.data.token);
          router.push('/dashboard');
        }
      } catch (err) {
        error.value = err.response?.data?.message || 'خطا در ورود';
      }
    };

    const verifyMfa = async () => {
      try {
        await axios.post(\\/auth/verify-mfa\, { token: mfaCode.value }, {
          headers: { Authorization: \Bearer \\ }
        });
        localStorage.setItem('token', tempToken.value);
        localStorage.removeItem('temp_token');
        router.push('/dashboard');
      } catch (err) {
        error.value = 'کد نامعتبر است';
      }
    };

    const loginWithGoogle = () => {
      window.location.href = \\/auth/google\;
    };

    const setupMfa = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(\\/auth/mfa/setup\, {
          headers: { Authorization: \Bearer \\ }
        });
        qrCodeUrl.value = res.data.qrCodeUrl;
        userMfaEnabled.value = false;
      } catch (err) {
        error.value = 'خطا در دریافت کد QR';
      }
    };

    const confirmMfa = async () => {
      const token = localStorage.getItem('token');
      try {
        await axios.post(\\/auth/mfa/verify\, { token: mfaVerifyCode.value }, {
          headers: { Authorization: \Bearer \\ }
        });
        userMfaEnabled.value = true;
        qrCodeUrl.value = '';
        alert('احراز هویت دو مرحله‌ای با موفقیت فعال شد!');
      } catch (err) {
        error.value = 'کد تأیید اشتباه است';
      }
    };

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('temp_token');
      isLoggedIn.value = false;
      userMfaEnabled.value = false;
      qrCodeUrl.value = '';
      router.push('/login');
    };

    const checkUserStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get(\\/auth/me\, { headers: { Authorization: \Bearer \\ } });
          isLoggedIn.value = true;
          userEmail.value = res.data.email;
          userMfaEnabled.value = res.data.isMfaEnabled;
        } catch (e) {
          localStorage.removeItem('token');
          isLoggedIn.value = false;
        }
      }
    };

    onMounted(() => {
      // بررسی پارامترهای URL برای لاگین گوگل
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      if (tokenParam) {
        localStorage.setItem('token', tokenParam);
        window.history.replaceState({}, document.title, "/login");
        checkUserStatus();
      } else {
        checkUserStatus();
      }
    });

    return {
      email, password, mfaCode, mfaVerifyCode, showMfa, error,
      isLoggedIn, userMfaEnabled, userEmail, qrCodeUrl,
      handleLogin, verifyMfa, loginWithGoogle, setupMfa, confirmMfa, logout
    };
  }
};
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
