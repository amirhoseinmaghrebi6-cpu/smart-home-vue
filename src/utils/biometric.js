// src/utils/biometric.js

export function isBiometricAvailable() {
  // بررسی وجود API وب‌اتن
  if (!window.PublicKeyCredential) return false
  
  // بررسی HTTPS یا localhost
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1'
  if (!isSecure) return false
  
  return true
}

export function getBiometricError() {
  if (!window.PublicKeyCredential) {
    return 'مرورگر شما از بیومتریک پشتیبانی نمی‌کند'
  }
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1'
  if (!isSecure) {
    return 'بیومتریک فقط در HTTPS یا localhost کار می‌کند'
  }
  return null
}

export async function registerBiometric() {
  if (!isBiometricAvailable()) {
    const err = getBiometricError()
    throw new Error(err || 'بیومتریک پشتیبانی نمی‌شود')
  }
  
  try {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const userId = new Uint8Array(16)
    crypto.getRandomValues(userId)

    const publicKey = {
      challenge,
      rp: { id: window.location.hostname || 'localhost', name: 'Smart Home' },
      user: { id: userId, name: 'user@local.ir', displayName: 'Smart Home User' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: { 
        authenticatorAttachment: 'platform', 
        userVerification: 'preferred' // تغییر به preferred برای سازگاری بیشتر
      },
      timeout: 60000,
      attestation: 'none' // تغییر به none برای سادگی در تست
    }

    const credential = await navigator.credentials.create({ publicKey })
    localStorage.setItem('sh_biometric_credential', JSON.stringify({
      id: credential.id,
      rawId: Array.from(new Uint8Array(credential.rawId))
    }))
    
    return { success: true, message: 'بیومتریک با موفقیت ثبت شد' }
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      throw new Error('کاربر اجازه‌ی دسترسی به بیومتریک را نداد')
    }
    throw e
  }
}

export async function loginWithBiometric() {
  if (!isBiometricAvailable()) {
    const err = getBiometricError()
    throw new Error(err || 'بیومتریک پشتیبانی نمی‌شود')
  }
  
  const saved = localStorage.getItem('sh_biometric_credential')
  if (!saved) throw new Error('هنوز اثر انگشت/چهره‌ای ثبت نکرده‌اید')
  
  try {
    const { id } = JSON.parse(saved)
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const publicKey = {
      challenge,
      allowCredentials: [{ 
        type: 'public-key', 
        id: Uint8Array.from(id, c => c.charCodeAt(0)) 
      }],
      timeout: 60000,
      userVerification: 'preferred'
    }

    await navigator.credentials.get({ publicKey })
    return { success: true, message: 'ورود با بیومتریک موفق' }
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      throw new Error('احراز هویت لغو شد یا دسترسی داده نشد')
    }
    throw e
  }
}