// src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import { store } from './store.js';

// ایمپورت کامپوننت‌ها
import LoginPage from './components/LoginPage.vue';
import RegisterPage from './components/RegisterPage.vue';
import Dashboard from './components/Dashboard.vue';
import EmergencyContacts from './components/EmergencyContacts.vue';
import DevicesPage from './components/DevicesPage.vue';
import ScenariosOverview from './components/ScenariosOverview.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', name: 'Login', component: LoginPage },
  { path: '/register', name: 'Register', component: RegisterPage },
  { 
    path: '/dashboard', 
    name: 'Dashboard', 
    component: Dashboard, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/emergency', 
    name: 'Emergency', 
    component: EmergencyContacts, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/devices/:largeId/:smallId', 
    name: 'Devices', 
    component: DevicesPage, 
    props: true, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/scenarios', 
    name: 'ScenariosOverview', 
    component: ScenariosOverview, 
    meta: { requiresAuth: true } 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// گارد روتر (AuthGuard)
router.beforeEach(async (to, from, next) => {
  // اطمینان از اینکه سشن اولیه‌سازی شده است
  if (!store.sessionReady) {
    await store.initSession();
  }

  const isAuthenticated = store.isLoggedIn;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
});

// ✅ خروجی پیش‌فرض حیاتی برای رفع خطای main.js
export default router;