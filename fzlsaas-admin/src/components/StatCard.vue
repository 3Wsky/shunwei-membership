<template>
  <div class="stat-card" :class="{ clickable }" @click="$emit('click')">
    <div class="stat-top">
      <span class="stat-title">{{ title }}</span>
      <span class="stat-icon" :class="'tone-' + type">
        <el-icon :size="16"><component :is="icon" /></el-icon>
      </span>
    </div>
    <div class="stat-num num">{{ displayValue }}</div>
    <div class="stat-foot">
      <span v-if="hasDelta" class="delta" :class="deltaDir">
        <el-icon :size="12">
          <component :is="deltaDir === 'down' ? 'CaretBottom' : deltaDir === 'up' ? 'CaretTop' : 'Minus'" />
        </el-icon>
        {{ Math.abs(delta as number) }}{{ deltaSuffix }}
      </span>
      <span class="stat-hint">{{ hint }}</span>
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
  delta?: number | null
  deltaSuffix?: string
  hint?: string
  clickable?: boolean
}>()

defineEmits<{ click: [] }>()

const hasDelta = computed(() => typeof props.delta === 'number' && Number.isFinite(props.delta))
const deltaDir = computed(() => {
  const d = props.delta as number
  if (!hasDelta.value || d === 0) return 'flat'
  return d > 0 ? 'up' : 'down'
})

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
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: 16px 18px;
  box-shadow: var(--shadow-xs);
  transition: box-shadow 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
  height: 100%;
  box-sizing: border-box;
}
.stat-card.clickable {
  cursor: pointer;
}
.stat-card.clickable:hover {
  border-color: var(--ink-300);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}
.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.stat-title {
  font-size: 13px;
  color: var(--ink-500);
  font-weight: 500;
}
.stat-icon {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tone-member { background: #eff4ff; color: #2563eb; }
.tone-newuser { background: #ecfdf3; color: #16a34a; }
.tone-grant { background: #fff7ed; color: #d97706; }
.tone-consume { background: #fef2f2; color: #dc2626; }
.tone-verify { background: #f5f3ff; color: #7c3aed; }
.tone-approval { background: #f0fdfa; color: #0d9488; }

.stat-num {
  font-size: 27px;
  font-weight: 700;
  color: var(--ink-900);
  line-height: 1.25;
  margin: 10px 0 6px;
}
.stat-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 18px;
}
.delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 20px;
}
.delta.up { color: var(--ok); background: var(--ok-soft); }
.delta.down { color: var(--err); background: var(--err-soft); }
.delta.flat { color: var(--ink-500); background: var(--neutral-soft); }
.stat-hint {
  font-size: 12px;
  color: var(--ink-400);
}
</style>
