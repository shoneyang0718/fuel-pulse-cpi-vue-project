<script setup>
import { ref } from 'vue';

const emit = defineEmits(['price-saved']);

const date = ref(new Date().toISOString().split('T')[0]);
const item = ref('');
const price = ref('');
const status = ref({ message: '', type: '' });

const handleSubmit = async () => {
  const isStaticPreview = window.location.hostname.endsWith("github.io");
  
  if (isStaticPreview) {
    status.value = { message: '預覽模式：無法儲存。', type: 'error' };
    return;
  }

  try {
    const res = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: date.value,
        item: item.value,
        price: Number(price.value)
      })
    });

    if (!res.ok) throw new Error('儲存失敗');

    status.value = { message: '已儲存紀錄！', type: 'success' };
    item.value = '';
    price.value = '';
    emit('price-saved');

    setTimeout(() => {
      status.value = { message: '', type: '' };
    }, 3000);
  } catch (error) {
    status.value = { message: '儲存失敗，請稍後再試。', type: 'error' };
  }
};
</script>

<template>
  <section class="panel">
    <h2>新增價格紀錄</h2>
    <p class="muted">輸入你實際支付的價格，讓 CPI 更貼近生活。</p>
    <form @submit.prevent="handleSubmit" class="form-grid">
      <label class="field">
        <span>日期</span>
        <input v-model="date" type="date" required />
      </label>
      <label class="field">
        <span>品項名稱</span>
        <input
          v-model="item"
          type="text"
          placeholder="例如：95 無鉛"
          required
        />
      </label>
      <label class="field">
        <span>價格 (NT$)</span>
        <input
          v-model="price"
          type="number"
          min="0"
          step="0.1"
          placeholder="33.4"
          required
        />
      </label>
      <button class="btn" type="submit">儲存紀錄</button>
    </form>
    <p v-if="status.message" :class="['status', status.type]" role="status" aria-live="polite">
      {{ status.message }}
    </p>
  </section>
</template>
