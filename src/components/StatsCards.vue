<script setup>
import { computed } from 'vue';

const props = defineProps({
  prices: {
    type: Array,
    required: true
  }
});

const count = computed(() => props.prices.length);

const latestPrice = computed(() => {
  if (props.prices.length === 0) return '--';
  return `NT$ ${Number(props.prices[0].price).toFixed(1)}`;
});

const averagePrice = computed(() => {
  if (props.prices.length === 0) return '--';
  const total = props.prices.reduce((sum, row) => sum + Number(row.price || 0), 0);
  return `NT$ ${(total / props.prices.length).toFixed(1)}`;
});
</script>

<template>
  <div class="stats">
    <div class="stat">
      <span class="stat-label">紀錄筆數</span>
      <span class="stat-value">{{ count }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">最新價格</span>
      <span class="stat-value">{{ latestPrice }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">平均價格</span>
      <span class="stat-value">{{ averagePrice }}</span>
    </div>
  </div>
</template>
