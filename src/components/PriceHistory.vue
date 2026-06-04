<script setup>
const props = defineProps({
  prices: {
    type: Array,
    required: true
  }
});

const formatPrice = (value) => `NT$ ${Number(value).toFixed(1)}`;
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>品項</th>
          <th>價格</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="(row, index) in prices" 
          :key="index"
          class="row-animate"
          :style="{ animationDelay: `${index * 40}ms` }"
        >
          <td>{{ row.date }}</td>
          <td>{{ row.item }}</td>
          <td>{{ formatPrice(row.price) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p v-if="prices.length === 0" class="empty-state">尚無紀錄。</p>
</template>
