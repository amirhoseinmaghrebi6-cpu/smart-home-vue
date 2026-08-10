// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import { store } from './store.js'
import LoginPage from './components/LoginPage.vue'
import RegisterPage from './components/RegisterPage.vue'
import Dashboard from './components/Dashboard.vue'
import EmergencyContacts from './components/EmergencyContacts.vue'
import DevicesPage from './components/DevicesPage.vue'
import ScenariosOverview from './components/ScenariosOverview.vue'

const routes = [
  {
    path: '/scenarios',
    name: 'ScenariosOverview',
    component: ScenariosOverview,
    meta: { requiresAuth: true }
  },
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
  { path: '/', redirect: '/dashboard' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (!store.sessionReady) {
    await store.initSession()
  }

  if (to.meta.requiresAuth && !store.isLoggedIn) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && store.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})
