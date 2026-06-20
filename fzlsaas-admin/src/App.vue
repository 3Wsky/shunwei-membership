<template>
  <router-view />
</template>

<style>
:root {
  --crmeb-topbar: #1890ff;
  --crmeb-topbar-dark: #096dd9;
  --crmeb-topbar-gradient: linear-gradient(90deg, #002c8c 0%, #0050b3 30%, #1890ff 70%, #40a9ff 100%);
  --el-color-primary: #1890ff;
  --el-color-primary-light-3: #69c0ff;
  --el-color-primary-light-5: #91d5ff;
  --el-color-primary-light-7: #bae7ff;
  --el-color-primary-light-9: #e6f7ff;
  --el-color-primary-dark-2: #096dd9;
  --el-border-radius-base: 2px;
  --el-border-radius-small: 2px;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  background: #f0f2f5;
  -webkit-font-smoothing: antialiased;
}

/* 全局大厂风组件微调 */
.el-button {
  font-weight: 400;
  border-radius: 2px;
}
.el-button--primary {
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.02);
}
.el-card {
  border-radius: 2px;
  border-color: #f0f0f0;
}
.el-input__wrapper,
.el-select__wrapper {
  border-radius: 2px;
}
.el-pagination {
  font-weight: 400;
}
.el-dialog {
  border-radius: 4px;
}
.el-drawer__header {
  margin-bottom: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}
</style>
