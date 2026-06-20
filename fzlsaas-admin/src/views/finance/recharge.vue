<template>
  <PageShell title="积分充值" subtitle="对应 CRMEB「充值记录」，微信支付购买积分订单">
    <template #actions>
      <el-button :loading="exporting" @click="exportData">数据导出</el-button>
    </template>
    <template #filter>
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="用户UID">
          <el-input-number v-model="filters.uid" :min="0" controls-position="right" style="width: 140px" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="filters.keyword" placeholder="订单号/UID" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </template>

    <el-alert
      v-if="!loading && total === 0"
      title="暂无充值订单。MVP3 积分微信充值上线后将在此展示。"
      type="info"
      :closable="false"
      show-icon
      class="mb-12"
    />

    <el-table :data="list" v-loading="loading" size="small">
      <el-table-column prop="orderNo" label="订单号" min-width="160" />
      <el-table-column label="用户" min-width="120">
        <template #default="{ row }">
          <div>{{ row.userNickname || '—' }}</div>
          <div class="sub-text">UID {{ row.uid }}</div>
        </template>
      </el-table-column>
      <el-table-column label="支付金额" width="100">
        <template #default="{ row }">{{ fmtMoney(row.payAmount) }}</template>
      </el-table-column>
      <el-table-column prop="integralAmount" label="获得积分" width="100" />
      <el-table-column label="汇率" width="120">
        <template #default="{ row }">1元={{ row.exchangeRate }}积分</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="payStatusType(row.payStatus)" size="small">{{ payStatusText(row.payStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付时间" width="165">
        <template #default="{ row }">{{ fmtUnixTime(row.paidAt) }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="165">
        <template #default="{ row }">{{ fmtUnixTime(row.createdAt) }}</template>
      </el-table-column>
      <template #empty>
        <TableEmpty icon="Coin" title="暂无充值记录" hint="会员积分充值订单会在此展示。" />
      </template>
    </el-table>

    <template #footer>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="load"
      />
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageShell from '@/components/PageShell.vue'
import TableEmpty from '@/components/TableEmpty.vue'
import { fmtUnixTime, fmtMoney } from '@/utils/format'
import { exportToCsv, fetchAllRows } from '@/utils/export'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = ref<{ uid?: number; keyword: string }>({ keyword: '' })

onMounted(() => load())

function payStatusText(status: number) {
  if (status === 1) return '已支付'
  if (status === -1) return '已取消'
  return '待支付'
}

function payStatusType(status: number) {
  if (status === 1) return 'success'
  if (status === -1) return 'info'
  return 'warning'
}

async function load() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/finance/recharge/list', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        uid: filters.value.uid || undefined,
        keyword: filters.value.keyword || undefined,
      },
    })
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

function reset() {
  filters.value = { keyword: '' }
  search()
}

const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  const loadingMsg = ElMessage({ message: '正在导出，请稍候…', type: 'info', duration: 0 })
  try {
    const rows = await fetchAllRows(async (p, ps) => {
      const data = await request.get('/api/admin/finance/recharge/list', {
        params: {
          page: p,
          pageSize: ps,
          uid: filters.value.uid || undefined,
          keyword: filters.value.keyword || undefined
        }
      })
      return { list: data?.list || [], total: data?.total || 0 }
    })
    if (!rows.length) {
      ElMessage.warning('当前筛选无数据可导出')
      return
    }
    exportToCsv('积分充值', [
      { label: '订单号', value: (r: any) => r.orderNo || '' },
      { label: '用户昵称', value: (r: any) => r.userNickname || '' },
      { label: 'UID', value: (r: any) => r.uid },
      { label: '支付金额', value: (r: any) => fmtMoney(r.payAmount) },
      { label: '获得积分', value: (r: any) => r.integralAmount ?? '' },
      { label: '汇率', value: (r: any) => `1元=${r.exchangeRate}积分` },
      { label: '状态', value: (r: any) => payStatusText(r.payStatus) },
      { label: '支付时间', value: (r: any) => fmtUnixTime(r.paidAt) },
      { label: '创建时间', value: (r: any) => fmtUnixTime(r.createdAt) }
    ], rows)
    ElMessage.success(`已导出 ${rows.length} 条充值记录`)
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    loadingMsg.close()
    exporting.value = false
  }
}
</script>

<style scoped>
.sub-text { font-size: 12px; color: rgba(0,0,0,.45); }
.mb-12 { margin-bottom: 12px; }
</style>
