<template>
  <el-alert
    v-if="autoPassStatus.consumption || autoPassStatus.integralMall"
    type="info"
    :closable="false"
    show-icon
    class="status-bar"
  >
    免审已开启：
    <span v-if="autoPassStatus.consumption">消费审批</span>
    <span v-if="autoPassStatus.consumption && autoPassStatus.integralMall"> · </span>
    <span v-if="autoPassStatus.integralMall">积分商城</span>
  </el-alert>

  <PageShell title="审批管理">
    <template #actions>
      <el-button link type="primary" @click="settingsOpen = true">免审设置</el-button>
    </template>

    <template #tabs>
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="待终审" name="pending" />
        <el-tab-pane label="全部记录" name="all" />
      </el-tabs>
    </template>

    <template v-if="activeTab === 'all'" #filter>
      <el-form :inline="true" @submit.prevent="loadAll">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable style="width: 140px">
            <el-option label="待店长" value="pending_store" />
            <el-option label="待超管" value="pending_admin" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAll">查询</el-button>
          <el-button @click="filters.status = ''; loadAll()">重置</el-button>
        </el-form-item>
      </el-form>
    </template>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="requestId" label="ID" width="70" />
      <el-table-column prop="customerUid" label="客户" width="80" />
      <el-table-column prop="consumptionAmount" label="消费金额" width="100">
        <template #default="{ row }">¥{{ row.consumptionAmount ?? row.consumeAmount }}</template>
      </el-table-column>
      <el-table-column prop="matchedTierCode" label="档位" width="80" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <ApprovalStatusTag :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <template v-if="activeTab === 'pending'">
            <el-button link type="success" @click="handleApprove(row)">通过</el-button>
            <el-button link type="danger" @click="handleReject(row)">驳回</el-button>
          </template>
        </template>
      </el-table-column>
      <template #empty>
        <TableEmpty icon="Stamp" title="暂无审批单" hint="门店发起的会员开通申请会在此等待处理。" />
      </template>
    </el-table>

    <template v-if="activeTab === 'all'" #footer>
      <el-pagination
        v-model:current-page="page"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadAll"
      />
    </template>
  </PageShell>

  <ApprovalDetailDialog
    v-model="detailOpen"
    :request-id="detailRequestId"
    :show-actions="activeTab === 'pending'"
    @approve="onDetailApprove"
    @reject="onDetailReject"
  />

  <ApprovalSettingsDrawer v-model="settingsOpen" @saved="loadAutoPassConfig" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageShell from '@/components/PageShell.vue'
import TableEmpty from '@/components/TableEmpty.vue'
import ApprovalStatusTag from './components/ApprovalStatusTag.vue'
import ApprovalDetailDialog from './components/ApprovalDetailDialog.vue'
import ApprovalSettingsDrawer from './components/ApprovalSettingsDrawer.vue'

const route = useRoute()
const activeTab = ref(route.query.tab === 'pending' ? 'pending' : 'all')
const loading = ref(false)
const tableData = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const filters = ref({ status: (route.query.status as string) || '' })
const detailOpen = ref(false)
const detailRequestId = ref<number | null>(null)
const settingsOpen = ref(false)
const autoPassStatus = ref({ consumption: false, integralMall: false })

onMounted(async () => {
  await loadAutoPassConfig()
  if (activeTab.value === 'pending') loadPending()
  else loadAll()
})

function onTabChange(name: string | number) {
  if (name === 'pending') loadPending()
  else loadAll()
}

async function loadPending() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/approval/todos')
    tableData.value = (Array.isArray(data) ? data : []).map(mapTodoRow)
  } catch {
    tableData.value = []
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/approval/list', {
      params: {
        page: page.value,
        pageSize: 20,
        status: filters.value.status || 'all'
      }
    })
    tableData.value = data?.list || []
    total.value = data?.total || 0
  } catch {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function mapTodoRow(row: any) {
  return {
    requestId: row.requestId,
    customerUid: row.customerUid,
    consumptionAmount: row.consumeAmount,
    matchedTierCode: row.matchedTierCode,
    status: 'pending_admin',
    ...row
  }
}

function openDetail(row: any) {
  detailRequestId.value = row.requestId
  detailOpen.value = true
}

async function handleApprove(row: any) {
  try {
    await ElMessageBox.confirm('确认通过该审批并发放权益？', '终审通过', { type: 'warning' })
    await request.post('/api/admin/approval/review', { requestId: row.requestId, action: 'approve' })
    ElMessage.success('已通过')
    loadPending()
  } catch { /* cancel or error */ }
}

async function handleReject(row: any) {
  await promptReject(row.requestId)
}

async function onDetailApprove(detail: any, comment: string) {
  try {
    await request.post('/api/admin/approval/review', {
      requestId: detail.requestId,
      action: 'approve',
      comment: comment || undefined
    })
    ElMessage.success('已通过')
    detailOpen.value = false
    loadPending()
  } catch { /* handled */ }
}

async function onDetailReject(detail: any) {
  const ok = await promptReject(detail.requestId)
  if (ok) detailOpen.value = false
}

async function promptReject(requestId: number): Promise<boolean> {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因（不少于 5 字）', '驳回', {
      type: 'warning',
      inputValidator: (v) => {
        if (!v || v.trim().length < 5) return '驳回原因不少于 5 字'
        return true
      },
      inputErrorMessage: '驳回原因不少于 5 字'
    })
    await request.post('/api/admin/approval/review', { requestId, action: 'reject', reason: value.trim() })
    ElMessage.info('已驳回')
    if (activeTab.value === 'pending') loadPending()
    else loadAll()
    return true
  } catch {
    return false
  }
}

async function loadAutoPassConfig() {
  try {
    autoPassStatus.value = await request.get('/api/admin/config/approval-auto-pass')
  } catch { /* ignore */ }
}
</script>

<style scoped>
.empty { text-align: center; padding: 40px; color: #999; }
.status-bar { margin-bottom: 16px; }
</style>
