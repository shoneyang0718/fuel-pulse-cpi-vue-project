<script setup>
import { ref } from 'vue';

const date = ref(new Date().toISOString().split('T')[0]);
const selectedFuel = ref('unleaded95');
const result = ref(null);
const error = ref('');

const fuelLabels = {
  unleaded92: "92 無鉛",
  unleaded95: "95 無鉛",
  unleaded98: "98 無鉛",
  diesel: "柴油"
};

const calculateInflation = async () => {
  const isStaticPreview = window.location.hostname.endsWith("github.io");
  error.value = '';
  result.value = null;

  if (isStaticPreview) {
    // 提供模擬資料以供預覽
    result.value = {
      type: selectedFuel.value,
      startDate: "2026-03-11",
      endDate: date.value,
      startPrice: 31.0,
      endPrice: 33.9,
      inflationRate: 9.35,
      note: "預覽模式：顯示模擬數據。"
    };
    return;
  }

  try {
    const res = await fetch(`/api/inflation?date=${date.value}&type=${selectedFuel.value}`);
    const data = await res.json();

    if (!res.ok) {
      error.value = data.error || '計算失敗';
      return;
    }

    result.value = data;
  } catch (err) {
    error.value = '連線失敗，請檢查伺服器是否運行。';
  }
};

const formatPrice = (value) => `NT$ ${Number(value).toFixed(1)}`;
</script>

<template>
  <section class="panel">
    <h2>近三個月通膨率</h2>
    <p class="muted">輸入日期與油品，系統會自動計算近三個月的通膨率。</p>
    <form @submit.prevent="calculateInflation" class="form-grid">
      <label class="field">
        <span>查詢日期</span>
        <input v-model="date" type="date" required />
      </label>
      <label class="field">
        <span>汽油種類</span>
        <select v-model="selectedFuel" required>
          <option value="unleaded92">92 無鉛</option>
          <option value="unleaded95">95 無鉛</option>
          <option value="unleaded98">98 無鉛</option>
          <option value="diesel">柴油</option>
        </select>
      </label>
      <button class="btn" type="submit">計算通膨率</button>
    </form>

    <div v-if="error" class="inflation-result error" role="status">
      {{ error }}
    </div>

    <div v-if="result" class="inflation-result success" role="status">
      <p class="inflation-title">{{ fuelLabels[result.type] }} 近三個月通膨率</p>
      <p class="inflation-rate">
        {{ result.inflationRate > 0 ? '+' : '' }}{{ result.inflationRate.toFixed(2) }}%
      </p>
      <p class="inflation-meta">
        起始 {{ result.startDate }} {{ formatPrice(result.startPrice) }} → 
        結束 {{ result.endDate }} {{ formatPrice(result.endPrice) }}
      </p>
      <p v-if="result.note" class="inflation-note">{{ result.note }}</p>
    </div>
  </section>
</template>
