<template>
  <div class="stat-card" :class="['stat-' + type, { clickable: clickable }]" @click="$emit('click')">
    <div class="stat-icon-wrap">
      <el-icon :size="22"><component :is="icon" /></el-icon>
    </div>
    <div class="stat-body">
      <div class="stat-title">{{ title }}</div>
      <div class="stat-num">{{ displayValue }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: string
  icon: string
  title: string
  value: string | number | null | undefined
  prefix?: string
  clickable?: boolean
}>()

defineEmits<{ click: [] }>()

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '--') return '--'
  if (typeof props.value === 'string' && props.value.startsWith('¥')) return props.value
  const num = Number(props.value)
  if (!Number.isFinite(num)) return String(props.value)
  const formatted = num.toLocaleString('zh-CN')
  return props.prefix ? `${props.prefix}${formatted}` : formatted
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff;
  border-radius: 2px;
  padding: 20px 24px;
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: box-shadow 0.2s, border-color 0.2s;
  cursor: default;
  height: 100%;
  box-sizing: border-box;
}
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-member .stat-icon-wrap { background: #e6f7ff; color: #1890ff; }
.stat-newuser .stat-icon-wrap { background: #f6ffed; color: #52c41a; }
.stat-grant .stat-icon-wrap { background: #fff7e6; color: #fa8c16; }
.stat-consume .stat-icon-wrap { background: #fff1f0; color: #f5222d; }
.stat-verify .stat-icon-wrap { background: #f9f0ff; color: #722ed1; }
.stat-approval .stat-icon-wrap { background: #e6fffb; color: #13c2c2; }

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-title {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 22px;
}
.stat-num {
  font-size: 30px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-top: 4px;
  line-height: 38px;
  font-variant-numeric: tabular-nums;
}
</style>
