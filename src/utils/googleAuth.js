// src/utils/googleAuth.js

// برای تست بدون اینترنت: این مقدار را true بگذارید
// ⚠️ هشدار امنیتی: قبل از استقرار Production حتماً به false تغییر دهید
export const USE_MOCK_GOOGLE = process.env.VITE_USE_MOCK_GOOGLE === 'true' || false

export function initGoogleAuth(clientId, onSuccess, onError) {
  // اگر حالت تستی فعال باشد، نیازی به لود اسکریپت گوگل نیست
  if (USE_MOCK_GOOGLE) {
    console.log('🧪 Google Auth: Mock mode enabled')
    return
  }
  
  if (window.google?.accounts) {
    window.google.accounts.id.initialize({ 
      client_id: clientId, 
      callback: (response) => {
        try {
          const payload = JSON.parse(atob(response.credential.split('.')[1]))
          onSuccess({ 
            email: payload.email, 
            name: payload.name, 
            picture: payload.picture 
          })
        } catch (e) {
          onError('خطا در پردازش پاسخ گوگل')
        }
      },
      error_callback: (err) => onError('خطای گوگل: ' + err)
    })
  } else {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.accounts) {
        window.google.accounts.id.initialize({ 
          client_id: clientId, 
          callback: (response) => {
            try {
              const payload = JSON.parse(atob(response.credential.split('.')[1]))
              onSuccess({ 
                email: payload.email, 
                name: payload.name, 
                picture: payload.picture 
              })
            } catch (e) {
              onError('خطا در پردازش پاسخ گوگل')
            }
          }
        })
      } else {
        onError('سرویس گوگل بارگذاری نشد')
      }
    }
    script.onerror = () => onError('خطا در لود اسکریپت گوگل')
    document.head.appendChild(script)
  }
}

export function triggerGoogleLogin(onSuccess, onError) {
  if (USE_MOCK_GOOGLE) {
    // شبیه‌سازی ورود با گوگل برای تست
    setTimeout(() => {
      onSuccess({
        email: 'test@gmail.com',
        name: 'کاربر تستی گوگل',
        picture: ''
      })
    }, 500)
    return
  }
  
  if (window.google?.accounts) {
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        onError('پنجره‌ی گوگل نمایش داده نشد')
      }
    })
  } else {
    onError('سرویس گوگل آماده نیست')
  }
}