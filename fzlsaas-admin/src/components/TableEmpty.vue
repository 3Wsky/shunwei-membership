<template>
  <div class="table-empty">
    <div class="table-empty-icon">
      <el-icon :size="26"><component :is="icon" /></el-icon>
    </div>
    <p class="table-empty-title">{{ title }}</p>
    <p v-if="hint" class="table-empty-hint">{{ hint }}</p>
    <div v-if="actionText || $slots.action" class="table-empty-action">
      <slot name="action">
        <el-button type="primary" size="small" @click="$emit('action')">{{ actionText }}</el-button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    hint?: string
    actionText?: string
  }>(),
  {
    icon: 'DocumentRemove',
    title: '暂无数据',
    hint: '',
    actionText: '',
  }
)

defineEmits<{ action: [] }>()
</script>

<style scoped>
.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px 28px;
  gap: 4px;
}
.table-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-subtle);
  color: var(--ink-400);
  margin-bottom: 10px;
}
.table-empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-600);
}
.table-empty-hint {
  margin: 0;
  font-size: 12px;
  color: var(--ink-400);
  line-height: 1.6;
  max-width: 360px;
  text-align: center;
}
.table-empty-action {
  margin-top: 12px;
}
</style>
