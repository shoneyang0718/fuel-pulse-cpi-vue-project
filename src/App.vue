<script setup>
import { ref, onMounted } from 'vue';
import PriceForm from './components/PriceForm.vue';
import InflationCalculator from './components/InflationCalculator.vue';
import PriceHistory from './components/PriceHistory.vue';
import StatsCards from './components/StatsCards.vue';

const prices = ref([]);
const search = ref('');
const isStaticPreview = window.location.hostname.endsWith("github.io");

const samplePrices = [
  { date: "2026-05-11", item: "92 無鉛", price: 32.4 },
  { date: "2026-05-11", item: "95 無鉛", price: 33.9 },
  { date: "2026-05-11", item: "98 無鉛", price: 35.9 },
  { date: "2026-05-11", item: "柴油", price: 31 },
  { date: "2026-05-04", item: "92 無鉛", price: 32.4 },
  { date: "2026-05-04", item: "95 無鉛", price: 33.9 },
  { date: "2026-05-04", item: "98 無鉛", price: 35.9 },
  { date: "2026-05-04", item: "柴油", price: 31 },
  { date: "2026-04-27", item: "92 無鉛", price: 32.4 },
  { date: "2026-04-27", item: "95 無鉛", price: 33.9 },
  { date: "2026-04-27", item: "98 無鉛", price: 35.9 },
  { date: "2026-04-27", item: "柴油", price: 31 }
];

const loadPrices = async () => {
  if (isStaticPreview) {
    prices.value = samplePrices;
    return;
  }

  try {
    const url = new URL("/api/prices", window.location.origin);
    if (search.value) {
      url.searchParams.set("search", search.value);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("讀取價格失敗。");
    prices.value = await res.json();
  } catch (error) {
    console.error(error);
  }
};

const handleSearch = (newSearch) => {
  search.value = newSearch;
  loadPrices();
};

const handlePriceSaved = () => {
  loadPrices();
};

onMounted(() => {
  loadPrices();
});
</script>

<template>
  <header class="hero">
    <div class="hero-text">
      <span class="badge">個人化 CPI 追蹤</span>
      <h1>油價脈動：你的個人 CPI</h1>
      <p>追蹤影響你日常油費的價格，建立真正貼近生活的 CPI。</p>
    </div>
    <div class="hero-card">
      <div>
        <p class="hero-label">焦點</p>
        <p class="hero-value">日常燃油</p>
      </div>
      <div>
        <p class="hero-label">指標</p>
        <p class="hero-value">你的通膨趨勢線</p>
      </div>
    </div>
  </header>

  <main class="layout">
    <PriceForm @price-saved="handlePriceSaved" />
    <InflationCalculator />
    
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>價格歷史</h2>
          <p class="muted">可依日期或品項篩選。</p>
        </div>
        <label class="search">
          <span>快速搜尋</span>
          <input 
            v-model="search" 
            @input="handleSearch($event.target.value)"
            type="search" 
            placeholder="例如：柴油" 
          />
        </label>
      </div>

      <StatsCards :prices="prices" />
      <PriceHistory :prices="prices" />
    </section>
  </main>

  <footer class="footer">
    本網站用於個人化 CPI 作業，資料儲存在本機 SQLite。
  </footer>
</template>

<style scoped>
/* Any App-specific styles */
</style>
