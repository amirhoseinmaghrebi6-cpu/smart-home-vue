<template>
  <div class="login-container" :style="{ background: currentTheme.bg }">
    <div class="login-box">
      <h2>{{ t.title }}</h2>

      <!-- حالت ۱: فرم ورود معمولی -->
      <form @submit.prevent="handleLogin" v-if="!showMfa && !isLoggedIn">
        <div class="form-group">
          <label>{{ t.email }}</label>
          <input type="email" v-model="email" required :placeholder="t.emailPlaceholder" />
        </div>
        <div class="form-group">
          <label>{{ t.password }}</label>
          <input type="password" v-model="password" required />
        </div>
        <button type="submit" class="btn-primary">{{ t.login }}</button>
        
        <div class="extra-links">
          <span class="link" @click="goToRegister">{{ t.register }}</span>
        </div>

        <hr />

        <button type="button" @click="loginWithGoogle" class="btn-google">
          <img src="https://www.google.com/favicon.ico" alt="G" />
          {{ t.loginWithGoogle }}
        </button>
      </form>

      <!-- حالت ۲: فرم وارد کردن کد MFA -->
      <div v-else-if="showMfa" class="mfa-form">
        <div class="mfa-icon">🔐</div>
        <h3>احراز هویت دو مرحله‌ای</h3>
        <p class="mfa-hint">
          کد ۶ رقمی را از اپلیکیشن Authenticator وارد کنید.
          <br/>
          <small v-if="userEmail">(کاربر: {{ userEmail }})</small>
        </p>
        
        <form @submit.prevent="verifyMfa">
          <div class="form-group">
            <label>کد تأیید</label>
            <input 
              type="text" 
              v-model="mfaCode" 
              required 
              placeholder="123456" 
              maxlength="6" 
              inputmode="numeric"
              class="mfa-input"
            />
          </div>
          <button type="submit" class="btn-primary">{{ t.verify }}</button>
          <button type="button" @click="cancelMfa" class="btn-secondary">{{ t.back }}</button>
        </form>
        <p v-if="error" class="error-text">{{ error }}</p>
      </div>

      <!-- حالت ۳: پنل کاربر وارد شده -->
      <div v-if="isLoggedIn" class="mfa-setup">
        <h3>{{ t.securitySettings }}</h3>
        <p>{{ t.welcomeUser }}: {{ userEmail }}</p>
        
        <div v-if="!userMfaEnabled">
          <button @click="setupMfa" class="btn-warning">{{ t.enableMfa }}</button>
        </div>
        <p v-else class="success-text">{{ t.mfaActive }}</p>

        <div v-if="qrCodeUrl" class="qr-section">
          <p>{{ t.scanQR }}</p>
          <div class="qr-wrapper">
            <qrcode-vue :value="qrCodeUrl" :size="qrSize" level="H" />
          </div>
          <p class="secret-text">کد سکرت: <b>{{ mfaSecret }}</b></p>
          <input type="text" v-model="mfaVerifyCode" :placeholder="t.enterCode" class="verify-input" />
          <button @click="confirmMfa" class="btn-primary">{{ t.confirm }}</button>
          <button @click="qrCodeUrl = ''" class="btn-secondary">انصراف</button>
        </div>
        
        <button @click="logout" class="btn-secondary btn-logout">{{ t.logout }}</button>
      </div>

      <p v-if="error && !showMfa" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import QrcodeVue from 'qrcode.vue';
import axios from 'axios';
import { store } from '../store.js';

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
    const mfaSecret = ref('');
    const showMfa = ref(false);
    const error = ref('');
    const isLoggedIn = ref(false);
    const userMfaEnabled = ref(false);
    const userEmail = ref('');
    const qrCodeUrl = ref('');
    const tempToken = ref(localStorage.getItem('temp_token') || '');
    
    // محاسبه سایز QR بر اساس عرض صفحه (ریسپانسیو)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
    const qrSize = ref(isMobile ? 180 : 200);

    const themes = [
      { name: 'Deep Ocean', bg: 'linear-gradient(135deg, #001f3f, #003566, #001219)' },
      { name: 'DOS', bg: 'linear-gradient(135deg, #000814, #001d3d, #003566)' },
      { name: 'Neon Blue', bg: 'linear-gradient(135deg, #001219, #005f73, #00b4d8)' },
      { name: 'Forest Dark', bg: 'linear-gradient(135deg, #0b1d13, #1b4332, #2d6a4f)' },
      { name: 'Nature', bg: 'linear-gradient(135deg, #283618, #606c38, #bc6c25)' },
      { name: 'Warm Home', bg: 'linear-gradient(135deg, #4e342e, #8d6e63, #d7ccc8)' },
      { name: 'Coffee', bg: 'linear-gradient(135deg, #3e2723, #5d4037, #8d6e63)' }
    ];
    const currentTheme = computed(() => themes[store.themeIndex] || themes[0]);

    const t = computed(() => ({
      fa: {
        title: 'ورود به خانه هوشمند',
        email: 'ایمیل',
        emailPlaceholder: 'example@gmail.com',
        password: 'رمز عبور',
        login: 'ورود',
        register: 'ثبت‌نام',
        loginWithGoogle: 'ورود با حساب گوگل',
        verify: 'تأیید و ورود',
        back: 'بازگشت',
        securitySettings: 'تنظیمات امنیتی',
        welcomeUser: 'کاربر گرامی',
        enableMfa: 'فعال‌سازی احراز هویت دو مرحله‌ای',
        mfaActive: 'احراز هویت دو مرحله‌ای فعال است ✅',
        scanQR: 'کد زیر را اسکن کنید:',
        enterCode: 'کد ۶ رقمی',
        confirm: 'تأیید نهایی',
        logout: 'خروج'
      },
      en: {
        title: 'Smart Home Login',
        email: 'Email',
        password: 'Password',
        login: 'Login',
        register: 'Register',
        loginWithGoogle: 'Sign in with Google',
        verify: 'Verify',
        back: 'Back',
        securitySettings: 'Security Settings',
        welcomeUser: 'Welcome',
        enableMfa: 'Enable 2FA',
        mfaActive: '2FA is active ✅',
        scanQR: 'Scan QR code:',
        enterCode: '6-digit code',
        confirm: 'Confirm',
        logout: 'Logout'
      },
      ar: {
        title: 'تسجيل الدخول',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        login: 'دخول',
        register: 'تسجيل',
        loginWithGoogle: 'الدخول عبر جوجل',
        verify: 'تحقق',
        back: 'رجوع',
        securitySettings: 'إعدادات الأمان',
        welcomeUser: 'مرحباً',
        enableMfa: 'تفعيل التحقق الثنائي',
        mfaActive: 'تم التفعيل ✅',
        scanQR: 'امسح الرمز:',
        enterCode: 'الرمز سداسي',
        confirm: 'تأكيد',
        logout: 'خروج'
      }
    })[store.lang]);

    const handleLogin = async () => {
      try {
        error.value = '';
        const res = await axios.post(`${API_URL}/auth/login`, { email: email.value, password: password.value });
        
        if (res.data.mfaRequired) {
          tempToken.value = res.data.token;
          localStorage.setItem('temp_token', res.data.token);
          userEmail.value = email.value;
          showMfa.value = true;
        } else {
          localStorage.setItem('token', res.data.token);
          router.push('/dashboard');
        }
      } catch (err) {
        error.value = err.response?.data?.message || 'خطا در ارتباط با سرور';
      }
    };

    const verifyMfa = async () => {
      try {
        error.value = '';
        const res = await axios.post(`${API_URL}/auth/verify-mfa`, { token: mfaCode.value }, {
          headers: { Authorization: `Bearer ${tempToken.value}` }
        });

        if (res.data.success) {
          localStorage.setItem('token', res.data.token);
          localStorage.removeItem('temp_token');
          router.push('/dashboard');
        } else {
          error.value = res.data.message || 'خطا در تأیید';
        }
      } catch (err) {
        error.value = err.response?.data?.message || 'کد نامعتبر است';
      }
    };

    const cancelMfa = () => {
      showMfa.value = false;
      tempToken.value = '';
      localStorage.removeItem('temp_token');
      error.value = '';
    };

    const loginWithGoogle = () => {
      window.location.href = `${API_URL}/auth/google`;
    };

    const goToRegister = () => {
      router.push('/register');
    };

    const setupMfa = async () => {
      const token = localStorage.getItem('token');
      if (!token) { error.value = 'لطفاً ابتدا وارد شوید'; return; }
      try {
        const res = await axios.get(`${API_URL}/auth/mfa/setup`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.qrCodeUrl) {
          qrCodeUrl.value = res.data.qrCodeUrl;
          mfaSecret.value = res.data.secret;
          userMfaEnabled.value = false;
        }
      } catch (err) {
        error.value = err.response?.data?.message || 'خطا در دریافت کد';
      }
    };

    const confirmMfa = async () => {
      const token = localStorage.getItem('token');
      try {
        await axios.post(`${API_URL}/auth/verify-mfa`, { token: mfaVerifyCode.value }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        userMfaEnabled.value = true;
        qrCodeUrl.value = '';
        alert('احراز هویت دو مرحله‌ای فعال شد!');
      } catch (err) {
        error.value = err.response?.data?.message || 'کد تأیید اشتباه است';
      }
    };

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('temp_token');
      isLoggedIn.value = false;
      router.push('/login');
    };

    const checkUserStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          isLoggedIn.value = true;
          userEmail.value = res.data.user.email;
          userMfaEnabled.value = res.data.user.isMfaEnabled;
        } catch (e) {
          localStorage.removeItem('token');
          isLoggedIn.value = false;
        }
      }
    };

    onMounted(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      const mfaRequiredParam = urlParams.get('mfaRequired');
      const emailParam = urlParams.get('email');

      if (tokenParam) {
        window.history.replaceState({}, document.title, "/login");
        if (mfaRequiredParam === 'true') {
          tempToken.value = tokenParam;
          localStorage.setItem('temp_token', tokenParam);
          showMfa.value = true;
          if(emailParam) userEmail.value = decodeURIComponent(emailParam);
        } else {
          localStorage.setItem('token', tokenParam);
          setTimeout(() => router.push('/dashboard'), 50);
          return;
        }
      }
      checkUserStatus();
    });

    return {
      email, password, mfaCode, mfaVerifyCode, mfaSecret, showMfa, error,
      isLoggedIn, userMfaEnabled, userEmail, qrCodeUrl, currentTheme, t, qrSize,
      handleLogin, verifyMfa, cancelMfa, loginWithGoogle, goToRegister, setupMfa, confirmMfa, logout
    };
  }
};
</script>

<style scoped>
/* تنظیمات کلی و ریست */
* {
  box-sizing: border-box;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh; /* برای موبایل‌های جدید */
  padding: 20px;
  color: white;
  transition: background 0.3s;
}

.login-box {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  
  width: 100%;
  max-width: 400px;
  
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

h2 { margin-bottom: 1.5rem; font-weight: 600; }
.form-group { margin-bottom: 1rem; text-align: left; }
label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; opacity: 0.9; }

input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: white;
  outline: none;
  box-sizing: border-box; /* جلوگیری از بیرون زدگی */
}

input::placeholder { color: rgba(255,255,255,0.6); }

/* دکمه‌ها */
button {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 0.5rem;
  border: none;
  transition: 0.2s;
}

.btn-primary { background: #007bff; color: white; }
.btn-primary:hover { background: #0056b3; }

.btn-secondary { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); }
.btn-warning { background: #ffc107; color: #333; margin-top: 1rem; }
.btn-logout { background: #dc3545; color: white; margin-top: 20px; }

.btn-google {
  background: white;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 1rem;
}
.btn-google:hover { background: #f1f1f1; }
.btn-google img { width: 20px; }

.extra-links { margin-top: 1rem; font-size: 0.9rem; }
.link { color: #4da6ff; cursor: pointer; text-decoration: underline; }
hr { border: 0; border-top: 1px solid rgba(255,255,255,0.2); margin: 1.5rem 0; }

.error-text { color: #ff6b6b; margin-top: 1rem; font-size: 0.9rem; }
.success-text { color: #51cf66; margin-top: 1rem; font-weight: bold; }

.mfa-setup { text-align: left; margin-top: 1rem; }
.qr-section { margin-top: 1.5rem; text-align: center; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 1rem; }
.qr-wrapper {
  background: white;
  padding: 10px;
  border-radius: 8px;
  display: inline-block;
  margin: 10px 0;
}
.secret-text { font-size: 0.8rem; margin-top: 5px; word-break: break-all; }
.verify-input { width: 100%; margin: 10px 0; padding: 8px; text-align: center; }

.mfa-form { text-align: center; }
.mfa-icon { font-size: 3rem; margin-bottom: 1rem; }
.mfa-hint { font-size: 0.9rem; opacity: 0.8; margin-bottom: 1.5rem; line-height: 1.6; }
.mfa-input { text-align: center; letter-spacing: 5px; font-size: 1.2rem; }

/* ================= ریسپانسیو موبایل ================= */
@media (max-width: 480px) {
  .login-container {
    padding: 15px;
    align-items: flex-start; /* چسبیدن به بالا در موبایل */
    padding-top: 40px;
  }

  .login-box {
    padding: 1.5rem;
    border-radius: 10px;
    max-width: 100%; /* پر کردن عرض در موبایل‌های خیلی کوچک */
  }

  h2 { font-size: 1.4rem; margin-bottom: 1.2rem; }
  label { font-size: 0.85rem; }
  
  input, button {
    padding: 0.75rem;
    font-size: 1rem; /* جلوگیری از زوم خودکار در آیفون */
  }

  .mfa-icon { font-size: 2.5rem; }
  .mfa-hint { font-size: 0.85rem; }
  
  .qr-wrapper { padding: 5px; }
  .secret-text { font-size: 0.7rem; }
}
</style>