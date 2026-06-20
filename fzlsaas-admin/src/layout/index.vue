<template>
  <div class="app-layout">
    <!-- 深色侧边栏：全部导航 + 折叠 + 底部用户 -->
    <aside class="sidebar" :class="{ collapsed: isCollapse }">
      <div class="brand">
        <span class="brand-mark">锦</span>
        <span v-if="!isCollapse" class="brand-text">锦程会员电商</span>
      </div>

      <nav class="nav">
        <div v-for="group in navGroups" :key="group.key" class="nav-group">
          <div v-if="!isCollapse" class="nav-label">{{ group.label }}</div>
          <el-tooltip
            v-for="item in group.items"
            :key="item.path"
            :content="item.title"
            placement="right"
            :disabled="!isCollapse"
          >
            <router-link
              class="nav-item"
              :class="{ active: route.path === item.path }"
              :to="item.path"
            >
              <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
              <span v-if="!isCollapse" class="nav-title">{{ item.title }}</span>
            </router-link>
          </el-tooltip>
        </div>
      </nav>

      <div class="side-foot">
        <el-dropdown trigger="click" placement="top-start" @command="onUserCommand">
          <div class="user-card">
            <span class="avatar">{{ userInitial }}</span>
            <span v-if="!isCollapse" class="user-meta">
              <span class="user-name">{{ userStore.username || 'Admin' }}</span>
              <span class="user-role">系统管理员</span>
            </span>
            <el-icon v-if="!isCollapse" class="user-caret"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="refresh"><el-icon><Refresh /></el-icon>刷新页面</el-dropdown-item>
              <el-dropdown-item command="logout" divided><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button class="collapse-btn" :title="isCollapse ? '展开' : '收起'" @click="isCollapse = !isCollapse">
          <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
        </button>
      </div>
    </aside>

    <!-- 内容区 -->
    <div class="content-wrap">
      <header class="topbar">
        <div class="breadcrumb">
          <span class="crumb-mod">{{ currentModuleLabel }}</span>
          <el-icon class="crumb-sep"><ArrowRight /></el-icon>
          <span class="crumb-page">{{ currentPageTitle }}</span>
        </div>
        <div class="topbar-right">
          <span class="env-tag">运营环境</span>
          <el-tooltip content="刷新当前页">
            <button class="icon-btn" @click="refreshPage"><el-icon><Refresh /></el-icon></button>
          </el-tooltip>
        </div>
      </header>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <div :key="route.fullPath" class="page-view">
              <component :is="Component" />
            </div>
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { MENU_MODULES, getModuleByRoute } from '@/config/menu'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)

interface NavItem {
  path: string
  title: string
  icon: string
}

const allChildren = computed(() => {
  return router.options.routes.find((r) => r.path === '/')?.children || []
})

function routeByName(name: string): NavItem | null {
  const r = allChildren.value.find((c) => c.path === name)
  if (!r || r.meta?.hidden) return null
  return {
    path: '/' + name,
    title: (r.meta?.title as string) || name,
    icon: (r.meta?.icon as string) || 'Document',
  }
}

const navGroups = computed(() =>
  MENU_MODULES.map((mod) => ({
    key: mod.key,
    label: mod.label,
    items: mod.routes.map(routeByName).filter((x): x is NavItem => x !== null),
  })).filter((g) => g.items.length > 0),
)

const currentModuleLabel = computed(
  () => MENU_MODULES.find((m) => m.key === getModuleByRoute(route.path))?.label || '工作台',
)
const currentPageTitle = computed(() => (route.meta?.title as string) || '')
const userInitial = computed(() => (userStore.username || 'A').charAt(0).toUpperCase())

function refreshPage() {
  router.go(0)
}
function onUserCommand(cmd: string) {
  if (cmd === 'refresh') refreshPage()
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--bg-page);
}

/* ── 深色侧边栏 ─────────────────────────────────────────── */
.sidebar {
  width: 224px;
  flex-shrink: 0;
  background: var(--side-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}
.sidebar.collapsed {
  width: 60px;
}

.brand {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  flex-shrink: 0;
}
.brand-mark {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 7px;
  background: var(--brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
}
.brand-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 12px;
}
.nav::-webkit-scrollbar {
  width: 0;
}
.nav-group {
  margin-bottom: 6px;
}
.nav-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--side-section);
  padding: 12px 10px 5px;
  text-transform: uppercase;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 38px;
  padding: 0 10px;
  margin: 2px 0;
  border-radius: var(--r-sm);
  color: var(--side-item);
  text-decoration: none;
  font-size: 13.5px;
  transition: background 0.14s ease, color 0.14s ease;
  white-space: nowrap;
}
.nav-item:hover {
  color: var(--side-item-hover);
  background: var(--side-item-hover-bg);
}
.nav-item.active {
  color: var(--side-item-active);
  background: var(--side-item-active-bg);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}
.nav-icon {
  font-size: 17px;
  flex-shrink: 0;
}
.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

/* ── 底部用户区 ─────────────────────────────────────────── */
.side-foot {
  flex-shrink: 0;
  border-top: 1px solid var(--side-line);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.user-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.14s ease;
  min-width: 0;
}
.user-card:hover {
  background: var(--side-item-hover-bg);
}
.avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}
.user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.user-name {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-role {
  color: var(--side-section);
  font-size: 11px;
}
.user-caret {
  color: var(--side-section);
  font-size: 12px;
}
.collapse-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: var(--side-item);
  border-radius: var(--r-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s ease;
}
.collapse-btn:hover {
  background: var(--side-item-hover-bg);
  color: #fff;
}
.collapsed .side-foot {
  flex-direction: column;
}

/* ── 内容区 ─────────────────────────────────────────────── */
.content-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.topbar {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--line);
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
}
.crumb-mod {
  color: var(--ink-400);
}
.crumb-sep {
  font-size: 11px;
  color: var(--ink-300);
}
.crumb-page {
  color: var(--ink-800);
  font-weight: 600;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.env-tag {
  font-size: 12px;
  color: var(--ok);
  background: var(--ok-soft);
  padding: 3px 9px;
  border-radius: 20px;
  font-weight: 500;
}
.icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  background: var(--bg-card);
  border-radius: var(--r-sm);
  color: var(--ink-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.14s ease;
}
.icon-btn:hover {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* 页面切换淡入 */
.page-view {
  width: 100%;
}
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
