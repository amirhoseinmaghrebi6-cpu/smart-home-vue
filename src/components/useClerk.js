import { ref, onMounted } from 'vue';
import Clerk from '@clerk/clerk-js';

const clerkInstance = new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const isLoaded = ref(false);
const user = ref(null);
const session = ref(null);

export function useClerk() {
  const loadClerk = async () => {
    try {
      await clerkInstance.load({
        signInUrl: '/sign-in', // اگر از کامپوننت‌های آماده استفاده نمی‌کنید
        signUpUrl: '/sign-up',
      });
      isLoaded.value = true;
      user.value = clerkInstance.user;
      session.value = clerkInstance.session;
    } catch (err) {
      console.error('Error loading Clerk:', err);
    }
  };

  const signOut = async () => {
    await clerkInstance.signOut();
    user.value = null;
    session.value = null;
  };

  const getToken = async () => {
    if (session.value) {
      return await session.value.getToken();
    }
    return null;
  };

  onMounted(() => {
    if (!isLoaded.value) loadClerk();
  });

  return {
    isLoaded,
    user,
    session,
    signOut,
    getToken,
    clerk: clerkInstance
  };
}