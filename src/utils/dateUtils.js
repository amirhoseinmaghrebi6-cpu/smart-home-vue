// src/utils/dateUtils.js
// ✅ فرمت‌دهی کاملاً ایزوله: تقویم همیشه ثابت می‌ماند، فقط زبان اعداد/نام ماه‌ها تغییر می‌کند
import { store } from '../store.js'

export function formatDate(dateInput, options = {}) {
  if (!dateInput) return '—'
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(date.getTime())) return 'تاریخ نامعتبر'

  // 🔑 جدا کردن صریح تقویم از زبان
  const calendarType = store.calendarSystem === 'shamsi' ? 'persian' : 'gregory'
  const localeBase = store.lang === 'en' ? 'en' : (store.lang === 'ar' ? 'ar' : 'fa')
  
  // ساخت locale استاندارد که فقط زبان را تعیین می‌کند
  const locale = `${localeBase}-IR`

  const formatOptions = {
    calendar: calendarType, // ✅ اجبار به استفاده از تقویم انتخاب‌شده
    dateStyle: options.dateStyle || 'short',
    timeStyle: options.includeTime ? 'short' : undefined,
    hour12: store.lang === 'en',
    ...options
  }

  // جلوگیری از تداخل dateStyle با فیلدهای دستی
  if (options.year || options.month || options.day || options.hour) {
    delete formatOptions.dateStyle
    delete formatOptions.timeStyle
  }

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(date)
  } catch (e) {
    console.warn('⚠️ خطا در فرمت تاریخ، استفاده از fallback:', e)
    return date.toLocaleDateString()
  }
}

// توابع سریع برای استفاده در UI
export const formatDateShort = (d) => formatDate(d)
export const formatDateTime = (d) => formatDate(d, { dateStyle: 'medium', includeTime: true })
export const formatTimeOnly = (d) => formatDate(d, { dateStyle: undefined, timeStyle: 'short' })