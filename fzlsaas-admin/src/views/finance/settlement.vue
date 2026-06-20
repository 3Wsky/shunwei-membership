<template>
  <PageShell title="商家结算" subtitle="异业商家核销台账，线下结算后在此标记">
    <template #actions>
      <el-button :loading="exporting" @click="exportData">数据导出</el-button>
    </template>
    <template #toolbar>
      <div class="summary-bar">
        <span>全平台待结算 <b class="pending">{{ fmtMoney(summary.pendingTotal) }}</b></span>
        <span>累计已结算 <b>{{ fmtMoney(summary.settledTotal) }}</b></span>
      </div>
    </template>

    <template #filter>
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="商家">
          <el-input v-model="filters.keyword" placeholder="名称/联系人" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </template>

    <template #tabs>
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="待结算商家" name="merchants" />
        <el-tab-pane label="结算记录" name="records" />
      </el-tabs>
    </template>

    <el-table v-if="activeTab === 'merchants'" :data="list" v-loading="loading" size="small">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="merchantName" label="商家名称" min-width="140" />
      <el-table-column prop="category" label="类目" width="100" />
      <el-table-column prop="contactPhone" label="电话" width="120" />
      <el-table-column label="待结算" width="110">
        <template #default="{ row }">
          <span class="pending">{{ fmtMoney(row.pendingSettlement) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="累计已结算" width="120">
        <template #default="{ row }">{{ fmtMoney(row.settledTotal) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :disabled="row.pendingSettlement <= 0"
            @click="openMark(row)"
          >
            标记已结算
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <TableEmpty icon="Money" title="暂无待结算商家" hint="商家产生核销后会在此累计待结算金额，线下结算后可标记。" />
      </template>
    </el-table>

    <el-table v-else :data="records" v-loading="recordsLoading" size="small">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="merchantName" label="商家" min-width="140" />
      <el-table-column label="结算金额" width="110">
        <template #default="{ row }">{{ fmtMoney(row.amount) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'settled' ? 'success' : 'warning'" size="small">
            {{ row.status === 'settled' ? '已结算' : '待结算' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="结算时间" width="165">
        <template #default="{ row }">{{ fmtUnixTime(row.settledAt || row.createdAt) }}</template>
      </el-table-column>
      <template #empty>
        <TableEmpty icon="Tickets" title="暂无结算记录" hint="标记结算后的记录会在此归档。" />
      </template>
    </el-table>

    <template #footer>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="activeTab === 'merchants' ? total : recordsTotal"
        layout="total, prev, pager, next"
        @current-change="onPageChange"
      />
    </template>
  </PageShell>

  <el-dialog v-model="markOpen" title="标记已结算" width="420px">
    <p class="mark-tip">确认商家 <b>{{ markForm.merchantName }}</b> 已在 offline 完成结算？</p>
    <el-form label-width="100px">
      <el-form-item label="结算金额">
        <el-input-number v-model="markForm.amount" :min="0.01" :max="markForm.maxAmount" :precision="2" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="markForm.remark" placeholder="如：2026年6月线下打款" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="markOpen = false">取消</el-button>
      <el-button type="primary" :loading="marking" @click="submitMark">确认标记</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageShell from '@/components/PageShell.vue'
import TableEmpty from '@/components/TableEmpty.vue'
import { fmtUnixTime, fmtMoney } from '@/utils/format'
import { exportToCsv, fetchAllRows } from '@/utils/export'

const loading = ref(false)
const recordsLoading = ref(false)
const list = ref<any[]>([])
const records = ref<any[]>([])
const total = ref(0)
const recordsTotal = ref(0)
const page = ref(1)
const pageSize = ref(20)
const activeTab = ref('merchants')
const filters = ref({ keyword: '' })
const summary = ref({ pendingTotal: 0, settledTotal: 0 })

const markOpen = ref(false)
const marking = ref(false)
const markForm = ref({
  merchantId: 0,
  merchantName: '',
  amount: 0,
  maxAmount: 0,
  remark: '线下已结算',
})

onMounted(() => {
  loadSummary()
  load()
})

async function loadSummary() {
  try {
    const data = await request.get('/api/admin/finance/summary')
    summary.value = data?.settlement || { pendingTotal: 0, settledTotal: 0 }
  } catch { /* ignore */ }
}

async function load() {
  if (activeTab.value === 'records') return loadRecords()
  loading.value = true
  try {
    const data = await request.get('/api/admin/finance/settlement/list', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
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

async function loadRecords() {
  recordsLoading.value = true
  try {
    const data = await request.get('/api/admin/finance/settlement/records', {
      params: { page: page.value, pageSize: pageSize.value },
    })
    records.value = data?.list || []
    recordsTotal.value = data?.total || 0
  } catch {
    records.value = []
    recordsTotal.value = 0
  } finally {
    recordsLoading.value = false
  }
}

function onTabChange() {
  page.value = 1
  if (activeTab.value === 'records') loadRecords()
  else load()
}

function onPageChange() {
  if (activeTab.value === 'records') loadRecords()
  else load()
}

function search() {
  page.value = 1
  load()
}

function reset() {
  filters.value = { keyword: '' }
  search()
}

function openMark(row: any) {
  markForm.value = {
    merchantId: row.id,
    merchantName: row.merchantName,
    amount: row.pendingSettlement,
    maxAmount: row.pendingSettlement,
    remark: '线下已结算',
  }
  markOpen.value = true
}

const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  const loadingMsg = ElMessage({ message: '正在导出，请稍候…', type: 'info', duration: 0 })
  try {
    if (activeTab.value === 'records') {
      const rows = await fetchAllRows(async (p, ps) => {
        const data = await request.get('/api/admin/finance/settlement/records', {
          params: { page: p, pageSize: ps }
        })
        return { list: data?.list || [], total: data?.total || 0 }
      })
      if (!rows.length) {
        ElMessage.warning('当前无数据可导出')
        return
      }
      exportToCsv('结算记录', [
        { label: 'ID', value: (r: any) => r.id },
        { label: '商家', value: (r: any) => r.merchantName || '' },
        { label: '结算金额', value: (r: any) => fmtMoney(r.amount) },
        { label: '状态', value: (r: any) => (r.status === 'settled' ? '已结算' : '待结算') },
        { label: '备注', value: (r: any) => r.remark || '' },
        { label: '结算时间', value: (r: any) => fmtUnixTime(r.settledAt || r.createdAt) }
      ], rows)
      ElMessage.success(`已导出 ${rows.length} 条结算记录`)
    } else {
      const rows = await fetchAllRows(async (p, ps) => {
        const data = await request.get('/api/admin/finance/settlement/list', {
          params: { page: p, pageSize: ps, keyword: filters.value.keyword || undefined }
        })
        return { list: data?.list || [], total: data?.total || 0 }
      })
      if (!rows.length) {
        ElMessage.warning('当前无数据可导出')
        return
      }
      exportToCsv('待结算商家', [
        { label: 'ID', value: (r: any) => r.id },
        { label: '商家名称', value: (r: any) => r.merchantName || '' },
        { label: '类目', value: (r: any) => r.category || '' },
        { label: '电话', value: (r: any) => r.contactPhone || '' },
        { label: '待结算', value: (r: any) => fmtMoney(r.pendingSettlement) },
        { label: '累计已结算', value: (r: any) => fmtMoney(r.settledTotal) }
      ], rows)
      ElMessage.success(`已导出 ${rows.length} 条商家数据`)
    }
  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    loadingMsg.close()
    exporting.value = false
  }
}

async function submitMark() {
  if (!markForm.value.amount || markForm.value.amount <= 0) {
    ElMessage.warning('请输入有效结算金额')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认标记商家「${markForm.value.merchantName}」已结算 ${fmtMoney(markForm.value.amount)}？`,
      '二次确认',
      { type: 'warning' }
    )
  } catch {
    return
  }

  marking.value = true
  try {
    await request.post('/api/admin/finance/settlement/mark', {
      merchantId: markForm.value.merchantId,
      amount: markForm.value.amount,
      remark: markForm.value.remark,
    })
    ElMessage.success('已标记结算')
    markOpen.value = false
    loadSummary()
    load()
    if (activeTab.value === 'records') loadRecords()
  } catch { /* handled */ }
  finally { marking.value = false }
}
</script>

<style scoped>
.summary-bar {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: rgba(0,0,0,.65);
}
.summary-bar b { font-size: 16px; color: rgba(0,0,0,.85); }
.pending { color: #d97706; }
.mark-tip { margin: 0 0 16px; color: rgba(0,0,0,.65); }
</style>
