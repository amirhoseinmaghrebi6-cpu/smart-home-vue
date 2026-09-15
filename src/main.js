// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // حالا درست کار می‌کند چون export default داریم
import './style.css';

const app = createApp(App);

app.use(router);
app.mount('#app');