<template>
  <div style="padding: 20px; color: white; text-align: center;">
    <h1>خوش آمدید!</h1>
    <p>سیستم با موفقیت لود شد.</p>
    <button @click="logout" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">خروج</button>
  </div>
</template>
<script>
export default {
  methods: {
    logout() {
      localStorage.removeItem('token');
      window.location.reload();
    }
  }
}
</script>
