<template>
  <PageShell title="积分记录" subtitle="对应 CRMEB「资金记录」，展示积分增减流水">
    <template #actions>
      <el-button :loading="exporting" @click="exportData">数据导出</el-button>
    </template>
    <template #filter>
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="用户UID">
          <el-input-number v-model="filters.uid" :min="0" controls-position="right" style="width: 140px" />
        </el-form-item>
        <el-form-item label="方向">
          <el-select v-model="filters.direction" clearable placeholder="全部" style="width: 120px">
            <el-option label="增加" :value="1" />
            <el-option label="减少" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="filters.bizType" clearable placeholder="全部" style="width: 140px">
            <el-option label="赠送发放" value="grant" />
            <el-option label="充值" value="recharge" />
            <el-option label="兑换消耗" value="consume" />
            <el-option label="过期扣减" value="expire" />
            <el-option label="人工调整" value="manual" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="单号/备注/UID" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </template>

    <el-table :data="list" v-loading="loading" size="small">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="用户" min-width="120">
        <template #default="{ row }">
          <div>{{ row.userNickname || '—' }}</div>
          <div class="sub-text">UID {{ row.uid }}</div>
        </template>
      </el-table-column>
      <el-table-column label="方向" width="80">
        <template #default="{ row }">
          <el-tag :type="row.direction === 1 ? 'success' : 'danger'" size="small">
            {{ row.direction === 1 ? '增加' : '减少' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="积分" width="110">
        <template #default="{ row }">
          <span :class="row.direction === 1 ? 'amt-plus' : 'amt-minus'">
            {{ row.direction === 1 ? '+' : '-' }}{{ row.amount }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="balanceAfter" label="变动后余额" width="110" />
      <el-table-column prop="bizType" label="业务类型" width="100" />
      <el-table-column prop="bizId" label="业务单号" min-width="130" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="时间" width="165">
        <template #default="{ row }">{{ fmtUnixTime(row.createdAt) }}</template>
      </el-table-column>
      <template #empty>
        <TableEmpty icon="Tickets" title="暂无积分流水" hint="会员积分的发放、兑换、过期等变动会在此逐笔记录。" />
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
import { fmtUnixTime } from '@/utils/format'
import { exportToCsv, fetchAllRows } from '@/utils/export'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = ref<{ uid?: number; direction?: number; bizType: string; keyword: string }>({
  bizType: '',
  keyword: '',
})

onMounted(() => load())

async function load() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/finance/integral-ledger', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        uid: filters.value.uid || undefined,
        direction: filters.value.direction ?? undefined,
        bizType: filters.value.bizType || undefined,
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
  filters.value = { bizType: '', keyword: '' }
  search()
}

const exporting = ref(false)

const BIZ_LABELS: Record<string, string> = {
  grant: '赠送发放',
  recharge: '充值',
  consume: '兑换消耗',
  expire: '过期扣减',
  manual: '人工调整'
}

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  const loadingMsg = ElMessage({ message: '正在导出，请稍候…', type: 'info', duration: 0 })
  try {
    const rows = await fetchAllRows(async (p, ps) => {
      const data = await request.get('/api/admin/finance/integral-ledger', {
        params: {
          page: p,
          pageSize: ps,
          uid: filters.value.uid || undefined,
          direction: filters.value.direction ?? undefined,
          bizType: filters.value.bizType || undefined,
          keyword: filters.value.keyword || undefined
        }
      })
      return { list: data?.list || [], total: data?.total || 0 }
    })
    if (!rows.length) {
      ElMessage.warning('当前筛选无数据可导出')
      return
    }
    exportToCsv('积分流水', [
      { label: 'ID', value: (r: any) => r.id },
      { label: '用户昵称', value: (r: any) => r.userNickname || '' },
      { label: 'UID', value: (r: any) => r.uid },
      { label: '方向', value: (r: any) => (r.direction === 1 ? '增加' : '减少') },
      { label: '积分', value: (r: any) => (r.direction === 1 ? '+' : '-') + r.amount },
      { label: '变动后余额', value: (r: any) => r.balanceAfter ?? '' },
      { label: '业务类型', value: (r: any) => BIZ_LABELS[r.bizType] || r.bizType || '' },
      { label: '业务单号', value: (r: any) => r.bizId || '' },
      { label: '备注', value: (r: any) => r.remark || '' },
      { label: '时间', value: (r: any) => fmtUnixTime(r.createdAt) }
    ], rows)
    ElMessage.success(`已导出 ${rows.length} 条积分流水`)
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
.amt-plus { color: #059669; font-weight: 600; }
.amt-minus { color: #dc2626; font-weight: 600; }
</style>
