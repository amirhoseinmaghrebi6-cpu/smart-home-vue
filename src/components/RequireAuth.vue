<template>
  <SignedIn>
    <slot />
  </SignedIn>
  <SignedOut>
    <div class="loading-auth">
      <p>در حال انتقال به صفحه ورود...</p>
    </div>
  </SignedOut>
</template>

<script setup>
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-vue'
</script>

<style>
.loading-auth {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: white;
}
</style>