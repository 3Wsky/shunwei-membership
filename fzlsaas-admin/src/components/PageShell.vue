<template>
  <div class="page-shell">
    <div v-if="title || $slots.actions" class="page-head">
      <div class="page-head-left">
        <h2 v-if="title" class="page-title">{{ title }}</h2>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="page-panel">
      <div v-if="$slots.filter" class="page-filter">
        <slot name="filter" />
      </div>

      <div v-if="$slots.tabs" class="page-tabs">
        <slot name="tabs" />
      </div>

      <div v-if="$slots.toolbar" class="page-toolbar">
        <slot name="toolbar" />
      </div>

      <div class="page-body">
        <slot />
      </div>

      <div v-if="$slots.footer" class="page-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>()
</script>

<style scoped>
.page-shell {
  min-height: 100%;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 16px;
}
.page-head-left { min-width: 0; }
.page-title {
  margin: 0;
  font-size: 19px;
  font-weight: 650;
  color: var(--ink-900);
  line-height: 26px;
  letter-spacing: -0.01em;
}
.page-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-400);
  line-height: 20px;
}
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* SaaS 内容面板：白底 + 极浅阴影 + 细灰线 */
.page-panel {
  background: var(--bg-card);
  border-radius: var(--r-card);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-xs);
  padding: 16px 18px 18px;
}

.page-filter {
  background: var(--bg-subtle);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 14px 14px 2px;
  margin-bottom: 14px;
}
.page-filter :deep(.el-form-item) {
  margin-bottom: 12px;
  margin-right: 16px;
}
.page-filter :deep(.el-form-item__label) {
  color: var(--ink-500);
  font-weight: 500;
}

.page-tabs {
  margin-bottom: 12px;
}
.page-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
.page-tabs :deep(.el-tabs__item) {
  height: 38px;
  line-height: 38px;
  font-size: 14px;
}
.page-tabs :deep(.el-tabs__item.is-active) {
  font-weight: 600;
  color: var(--el-color-primary);
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
  width: 100%;
}
.page-toolbar :deep(.toolbar-left),
.page-toolbar :deep(.toolbar-right) {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.page-toolbar :deep(.toolbar-right) {
  margin-left: auto;
}

.page-body {
  min-height: 120px;
}

.page-footer {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
}
</style>
