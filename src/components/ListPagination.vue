<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ total: number; size?: number }>();
const page = defineModel<number>({ required: true });
const size = computed(() => props.size || 20);
const pages = computed(() => Math.max(1, Math.ceil(props.total / size.value)));
</script>
<template>
  <nav class="list-pagination" aria-label="列表分页">
    <span role="status"
      >{{ total ? (page - 1) * size + 1 : 0 }}–{{
        Math.min(page * size, total)
      }}
      条，共 {{ total }} 条</span
    >
    <div>
      <button class="btn secondary" :disabled="page <= 1" @click="page--">
        上一页</button
      ><span>{{ page }} / {{ pages }}</span
      ><button class="btn secondary" :disabled="page >= pages" @click="page++">
        下一页
      </button>
    </div>
  </nav>
</template>
<style scoped>
.list-pagination {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 20px;
  color: #475569;
  font-size: 12px;
}
.list-pagination > div {
  display: flex;
  align-items: center;
  gap: 14px;
}
.list-pagination .btn {
  min-height: 36px;
  padding: 8px 12px;
}
@media (max-width: 600px) {
  .list-pagination {
    flex-wrap: wrap;
  }
}
</style>
