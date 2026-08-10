// src/utils/imageCompressor.js
// ✅ فشرده‌سازی و تغییر سایز تصویر قبل از ذخیره در LocalStorage

export function compressImage(file, maxWidth = 150, maxHeight = 150, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('فایل انتخاب‌شده تصویر نیست'))
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // محاسبه ابعاد جدید با حفظ نسبت تصویر
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // تبدیل به Base64 فشرده (JPEG با کیفیت تنظیم‌شده)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => reject(new Error('خطا در بارگذاری تصویر'))
    }
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'))
  })
}