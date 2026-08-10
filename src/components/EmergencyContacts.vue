<template>
  <div class="emergency-container">
    <div class="emergency-card">
      <h2>{{ t.title }}</h2>
      
      <!-- ✅ فرم افزودن شماره -->
      <form @submit.prevent="handleAdd" class="add-form">
        <div class="input-group">
          <label>{{ t.phoneLabel }}</label>
          <input v-model="form.phoneNumber" type="tel" required placeholder="09123456789" maxlength="11" dir="ltr" />
        </div>
        
        <div class="input-group">
          <label>{{ t.labelLabel }}</label>
          <input v-model="form.label" type="text" required :placeholder="t.labelPlaceholder" />
        </div>

        <div class="input-group">
          <label>{{ t.priorityLabel }}</label>
          <select v-model="form.priority" class="select-input">
            <option value="1">{{ t.priority1 }}</option>
            <option value="2">{{ t.priority2 }}</option>
            <option value="3">{{ t.priority3 }}</option>
          </select>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '⏳' : t.addBtn }}
        </button>
      </form>

      <!-- ✅ نمایش پیام به صورت پویا بر اساس زبان -->
      <div v-if="messageKey" :class="['msg', isError ? 'error' : 'success']">{{ t[messageKey] }}</div>

      <!-- ✅ لیست شماره‌ها -->
      <div class="contacts-list">
        <h3>{{ t.listTitle }}</h3>
        <div v-if="loadingList" class="loading">{{ t.loading }}</div>
        <div v-else-if="contacts.length === 0" class="empty">{{ t.empty }}</div>
        
        <div v-for="contact in contacts" :key="contact.id" class="contact-item">
          <div class="contact-info">
            <span class="phone" dir="ltr">{{ contact.phoneNumber }}</span>
            <span class="label">{{ contact.label }}</span>
            <span class="priority-badge">{{ t.priorityLabel }} {{ contact.priority }}</span>
          </div>
          <button class="delete-btn" @click="handleDelete(contact.id)">🗑️</button>
        </div>
      </div>
    </div>

    <!-- ✅ دیالوگ تایید حذف سفارشی (چندزبانه) -->
    <Transition name="fade">
      <div v-if="showConfirmDialog" class="modal-overlay" @click="cancelDelete">
        <div class="modal-card" @click.stop>
          <h3>{{ t.confirmTitle }}</h3>
          <p>{{ t.confirmMessage }}</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="cancelDelete">{{ t.btnCancel }}</button>
            <button class="btn-confirm" @click="confirmDelete">{{ t.btnConfirm }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'
import { emergencyApi } from '../api/emergencyApi.js'

// ✅ دیکشنری ترجمه کامل
const t = computed(() => ({
  fa: {
    title: '🚨 شماره‌های اضطراری',
    phoneLabel: 'شماره تماس (۰۹...)',
    labelLabel: 'نام/عنوان',
    labelPlaceholder: 'مثلاً: پدر، همسر، نگهبان',
    priorityLabel: 'اولویت:',
    priority1: '۱ - بالاترین',
    priority2: '۲ - متوسط',
    priority3: '۳ - پایین‌ترین',
    addBtn: '➕ افزودن شماره',
    listTitle: 'لیست شماره‌های فعال:',
    loading: 'در حال بارگذاری...',
    empty: 'هنوز شماره‌ای ثبت نشده است.',
    successAdd: '✅ شماره با موفقیت اضافه شد.',
    successDelete: '✅ شماره حذف شد.',
    errPhone: '❌ فرمت شماره اشتباه است (باید با ۰۹ شروع شود و ۱۱ رقم باشد).',
    errServer: '❌ خطا در ارتباط با سرور.',
    confirmTitle: 'تأیید حذف',
    confirmMessage: 'آیا از حذف این شماره اطمینان دارید؟',
    btnCancel: 'انصراف',
    btnConfirm: 'حذف'
  },
  en: {
    title: '🚨 Emergency Contacts',
    phoneLabel: 'Phone Number (09...)',
    labelLabel: 'Label/Name',
    labelPlaceholder: 'e.g., Father, Wife, Guard',
    priorityLabel: 'Priority:',
    priority1: '1 - Highest',
    priority2: '2 - Medium',
    priority3: '3 - Lowest',
    addBtn: '➕ Add Contact',
    listTitle: 'Active Contacts List:',
    loading: 'Loading...',
    empty: 'No contacts added yet.',
    successAdd: '✅ Contact added successfully.',
    successDelete: '✅ Contact deleted.',
    errPhone: '❌ Invalid phone format (must start with 09 and be 11 digits).',
    errServer: '❌ Server connection error.',
    confirmTitle: 'Confirm Delete',
    confirmMessage: 'Are you sure you want to delete this contact?',
    btnCancel: 'Cancel',
    btnConfirm: 'Delete'
  },
  ar: {
    title: '🚨 جهات الاتصال الطارئة',
    phoneLabel: 'رقم الهاتف (٠٩...)',
    labelLabel: 'الاسم/اللقب',
    labelPlaceholder: 'مثال: الأب، الزوجة، الحارس',
    priorityLabel: 'الأولوية:',
    priority1: '١ - الأعلى',
    priority2: '٢ - متوسط',
    priority3: '٣ - الأدنى',
    addBtn: '➕ إضافة جهة اتصال',
    listTitle: 'قائمة جهات الاتصال النشطة:',
    loading: 'جاري التحميل...',
    empty: 'لم تتم إضافة جهات اتصال بعد.',
    successAdd: '✅ تمت الإضافة بنجاح.',
    successDelete: '✅ تم الحذف.',
    errPhone: '❌ صيغة الرقم غير صحيحة (يجب أن يبدأ بـ ٠ ويتكون من ١١ رقماً).',
    errServer: '❌ خطأ في الاتصال بالخادم.',
    confirmTitle: 'تأكيد الحذف',
    confirmMessage: 'هل أنت متأكد من حذف جهة الاتصال هذه؟',
    btnCancel: 'إلغاء',
    btnConfirm: 'حذف'
  }
})[store.lang])

// ✅ متغیرهای حالت
const contacts = ref([])
const form = ref({ phoneNumber: '', label: '', priority: '1' })
const loading = ref(false)
const loadingList = ref(false)
const messageKey = ref('')
const isError = ref(false)
const showConfirmDialog = ref(false)
const contactToDelete = ref(null)

// ✅ دریافت لیست شماره‌ها از بک‌اند
async function fetchContacts() {
  loadingList.value = true
  try {
    const res = await emergencyApi.getContacts()
    contacts.value = res.data
  } catch (err) {
    console.error('Fetch contacts error:', err)
  } finally {
    loadingList.value = false
  }
}

// ✅ افزودن شماره جدید
async function handleAdd() {
  // اعتبارسنجی شماره ایرانی
  const phoneRegex = /^09\d{9}$/
  if (!phoneRegex.test(form.value.phoneNumber)) {
    isError.value = true
    messageKey.value = 'errPhone'
    return
  }

  loading.value = true
  messageKey.value = ''
  
  try {
    await emergencyApi.addContact(form.value)
    messageKey.value = 'successAdd'
    isError.value = false
    form.value = { phoneNumber: '', label: '', priority: '1' } // ریست فرم
    fetchContacts() // رفرش لیست
  } catch (err) {
    messageKey.value = 'errServer'
    isError.value = true
    console.error('Add contact error:', err)
  } finally {
    loading.value = false
  }
}

// ✅ باز کردن دیالوگ حذف (به جای confirm() مرورگر)
function handleDelete(id) {
  contactToDelete.value = id
  showConfirmDialog.value = true
}

// ✅ انصراف از حذف
function cancelDelete() {
  showConfirmDialog.value = false
  contactToDelete.value = null
}

// ✅ تأیید و انجام حذف واقعی
async function confirmDelete() {
  if (!contactToDelete.value) return
  
  try {
    await emergencyApi.deleteContact(contactToDelete.value)
    messageKey.value = 'successDelete'
    isError.value = false
    fetchContacts()
  } catch (err) {
    messageKey.value = 'errServer'
    isError.value = true
    console.error('Delete contact error:', err)
  } finally {
    showConfirmDialog.value = false
    contactToDelete.value = null
  }
}

onMounted(() => {
  fetchContacts()
})
</script>

<style scoped>
.emergency-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 60px);
}

.emergency-card {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 24px;
  padding: 24px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.4);
  color: white;
}

h2 { text-align: center; margin-bottom: 20px; font-size: 20px; }
h3 { font-size: 16px; margin: 20px 0 10px; opacity: 0.8; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; }

.input-group { margin-bottom: 15px; }
label { display: block; font-size: 12px; opacity: 0.7; margin-bottom: 5px; }

input, .select-input {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: white;
  font-size: 14px;
  outline: none;
}
input:focus, .select-input:focus { border-color: #22d3ee; }
.select-input { cursor: pointer; }
.select-input option { background: #1e293b; color: white; }

.btn-primary {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #22d3ee, #818cf8);
  color: #000;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; }

.msg {
  margin-top: 15px;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}
.error { background: rgba(239,68,68,0.2); color: #fca5a5; }
.success { background: rgba(34,197,94,0.2); color: #86efac; }

.contacts-list { margin-top: 20px; }
.loading, .empty { text-align: center; opacity: 0.6; font-size: 13px; padding: 10px; }

.contact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.contact-info { display: flex; flex-direction: column; gap: 2px; }
.phone { font-weight: bold; font-size: 15px; letter-spacing: 1px; }
.label { font-size: 12px; opacity: 0.7; }
.priority-badge { font-size: 10px; background: rgba(34,211,238,0.2); padding: 2px 6px; border-radius: 4px; width: fit-content; }

.delete-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.6;
  transition: 0.2s;
}
.delete-btn:hover { opacity: 1; transform: scale(1.1); }

/* ✅ استایل دیالوگ سفارشی */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 350px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  color: white;
}

.modal-card h3 {
  margin: 0 0 12px;
  font-size: 18px;
  text-align: center;
}

.modal-card p {
  margin: 0 0 20px;
  opacity: 0.8;
  text-align: center;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-confirm {
  background: rgba(239, 68, 68, 0.8);
  color: white;
}

.btn-cancel:hover { background: rgba(255, 255, 255, 0.2); }
.btn-confirm:hover { background: rgba(239, 68, 68, 1); }

/* انیمیشن fade */
.fade-enter-active, .fade-leave-active { transition: 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>