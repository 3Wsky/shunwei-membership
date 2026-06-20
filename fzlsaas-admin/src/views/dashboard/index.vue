<template>
  <PageShell title="数据看板">
    <template #actions>
      <el-radio-group v-model="range" size="default" @change="loadSummary">
        <el-radio-button value="today">今日</el-radio-button>
        <el-radio-button value="7d">近7日</el-radio-button>
        <el-radio-button value="30d">近30日</el-radio-button>
      </el-radio-group>
    </template>

    <div v-loading="loading" class="kpi-grid">
      <StatCard
        v-for="card in statCards"
        :key="card.key"
        :type="card.type"
        :icon="card.icon"
        :title="card.title"
        :value="card.value"
        :delta="card.delta"
        :delta-suffix="card.deltaSuffix"
        :hint="card.hint"
        :clickable="!!card.onClick"
        @click="card.onClick?.()"
      />
    </div>

    <div class="chart-section">
      <div class="section-head">
        <span class="section-title">积分趋势</span>
        <span class="section-desc">新增 vs 消耗（{{ rangeLabel }}）</span>
      </div>
      <LazyIntegralTrendChart
        :labels="trend.labels"
        :granted="trend.integralGranted"
        :consumed="trend.integralConsumed"
      />
    </div>

    <div class="quick-section">
      <span class="quick-label">快捷入口</span>
      <el-space wrap :size="16">
        <el-link type="primary" @click="router.push('/approval?tab=pending')">
          待审批 {{ cards.pendingApproval ?? 0 }} 条
        </el-link>
        <el-link @click="router.push('/approval?status=approved')">
          今日通过 {{ cards.approvalApprovedToday ?? 0 }} 条
        </el-link>
        <el-link type="primary" @click="router.push('/finance-settlement')">
          待结算 ¥{{ formatNum(cards.pendingSettlement) }}
        </el-link>
      </el-space>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import PageShell from '@/components/PageShell.vue'
import StatCard from '@/components/StatCard.vue'
import LazyIntegralTrendChart from '@/components/LazyIntegralTrendChart'

const router = useRouter()
const loading = ref(false)
const range = ref<'today' | '7d' | '30d'>('today')
const cards = ref<Record<string, any>>({})
const trend = ref({ labels: [] as string[], integralGranted: [] as number[], integralConsumed: [] as number[] })

let timer: ReturnType<typeof setInterval> | null = null

// 由趋势数组计算环比（末值 vs 前一日），用于 KPI 卡片箭头
function dod(arr: number[]): number | null {
  if (!arr || arr.length < 2) return null
  const last = Number(arr[arr.length - 1] || 0)
  const prev = Number(arr[arr.length - 2] || 0)
  if (prev === 0) return last > 0 ? 100 : null
  return Math.round(((last - prev) / prev) * 100)
}

const statCards = computed(() => [
  {
    key: 'member',
    type: 'member',
    icon: 'User',
    title: '会员总数',
    value: cards.value.memberTotal,
    delta: Number(cards.value.newUsersToday) || 0,
    deltaSuffix: '',
    hint: '今日新增',
  },
  {
    key: 'grant',
    type: 'grant',
    icon: 'TrendCharts',
    title: '积分发放',
    value: cards.value.integralGrantedToday,
    delta: dod(trend.value.integralGranted),
    deltaSuffix: '%',
    hint: '较前一日',
  },
  {
    key: 'verify',
    type: 'verify',
    icon: 'Checked',
    title: '今日核销',
    value: cards.value.verifyToday,
    hint: '兑换订单核销',
  },
  {
    key: 'approval',
    type: 'approval',
    icon: 'Stamp',
    title: '待审批订单',
    value: cards.value.pendingApproval,
    hint: '点击前往处理',
    onClick: () => router.push('/approval?tab=pending'),
  },
  {
    key: 'newuser',
    type: 'newuser',
    icon: 'UserFilled',
    title: '今日新注册',
    value: cards.value.newUsersToday,
    hint: rangeLabel.value + '新进会员',
  },
  {
    key: 'consume',
    type: 'consume',
    icon: 'SoldOut',
    title: '积分消耗',
    value: cards.value.integralConsumedToday,
    delta: dod(trend.value.integralConsumed),
    deltaSuffix: '%',
    hint: '较前一日',
  },
])

const rangeLabel = computed(() => ({ today: '今日', '7d': '近7日', '30d': '近30日' }[range.value]))

function formatNum(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '--'
}

async function loadSummary() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/dashboard/summary', { params: { range: range.value } })
    cards.value = data?.cards || {}
    trend.value = data?.trend || { labels: [], integralGranted: [], integralConsumed: [] }
  } catch {
    cards.value = {}
    trend.value = { labels: [], integralGranted: [], integralConsumed: [] }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSummary()
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') loadSummary()
  }, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 4px;
}
@media (max-width: 1180px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
.chart-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-800);
}
.section-desc {
  font-size: 13px;
  color: var(--ink-400);
}
.quick-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
}
.quick-label {
  display: block;
  font-size: 13px;
  color: var(--ink-400);
  margin-bottom: 10px;
}
</style>
