<template>
  <PageShell title="商家管理">
    <template #tabs>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="商家列表" name="list" />
        <el-tab-pane label="开通商家" name="create" />
      </el-tabs>
    </template>

    <template v-if="activeTab === 'create'" #toolbar>
      <el-button type="primary" @click="handleCreate" :loading="creating">创建商家</el-button>
    </template>

    <template v-if="activeTab === 'list'">
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="merchantName" label="名称" />
        <el-table-column prop="category" label="类目" width="100" />
        <el-table-column prop="contactPhone" label="电话" width="120" />
        <el-table-column prop="pendingSettlement" label="待结算" width="100">
          <template #default="{ row }">¥{{ row.pendingSettlement }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <TableEmpty
            icon="Shop"
            title="暂无异业商家"
            hint="开通异业商家后，可支持其核销会员权益并生成结算台账。"
            action-text="开通商家"
            @action="activeTab = 'create'"
          />
        </template>
      </el-table>
    </template>

    <el-form v-else :model="createForm" label-width="120px" style="max-width:500px">
      <el-form-item label="商家名称"><el-input v-model="createForm.merchantName" /></el-form-item>
      <el-form-item label="类目"><el-input v-model="createForm.category" /></el-form-item>
      <el-form-item label="联系人"><el-input v-model="createForm.contactName" /></el-form-item>
      <el-form-item label="联系电话"><el-input v-model="createForm.contactPhone" /></el-form-item>
      <el-form-item label="绑定UID"><el-input-number v-model="createForm.loginUid" :min="1" /></el-form-item>
      <el-form-item label="核销权限"><el-switch v-model="createForm.canVerify" /></el-form-item>
    </el-form>
  </PageShell>

  <el-drawer v-model="editOpen" title="商家详情" size="520px">
    <el-tabs v-model="editTab">
      <el-tab-pane label="基础资料" name="base">
        <el-form :model="editForm" label-width="100px">
          <el-form-item label="名称"><el-input v-model="editForm.merchantName" /></el-form-item>
          <el-form-item label="地址"><el-input v-model="editForm.storeAddress" /></el-form-item>
          <el-form-item label="营业时间"><el-input v-model="editForm.businessHours" /></el-form-item>
          <el-form-item label="核销"><el-switch v-model="editForm.canVerify" /></el-form-item>
          <el-button type="primary" @click="saveMerchant">保存</el-button>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="核销记录" name="logs">
        <el-table :data="verifyLogs" size="small">
          <el-table-column prop="customerUid" label="客户" width="80" />
          <el-table-column prop="amount" label="金额" width="80" />
          <el-table-column prop="createdAt" label="时间" :formatter="fmtTime" />
          <template #empty>
            <TableEmpty icon="Document" title="暂无核销记录" />
          </template>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageShell from '@/components/PageShell.vue'
import TableEmpty from '@/components/TableEmpty.vue'

const activeTab = ref('list')
const loading = ref(false)
const list = ref<any[]>([])
const creating = ref(false)
const createForm = ref({ merchantName: '', category: '', contactName: '', contactPhone: '', loginUid: 0, canVerify: true })
const editOpen = ref(false)
const editTab = ref('base')
const editForm = ref<any>({})
const verifyLogs = ref<any[]>([])

onMounted(() => loadList())

async function loadList() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/merchant/list')
    list.value = data?.list || []
  } catch { list.value = [] }
  finally { loading.value = false }
}

async function handleCreate() {
  creating.value = true
  try {
    await request.post('/api/admin/merchant/create', createForm.value)
    ElMessage.success('创建成功')
    activeTab.value = 'list'
    loadList()
  } catch { /* handled */ }
  finally { creating.value = false }
}

async function openEdit(row: any) {
  editForm.value = { ...row }
  editOpen.value = true
  const logs = await request.get(`/api/admin/merchant/${row.id}/verify-logs`).catch(() => ({ list: [] }))
  verifyLogs.value = logs?.list || []
}

async function saveMerchant() {
  try {
    await request.put(`/api/admin/merchant/${editForm.value.id}`, editForm.value)
    ElMessage.success('已保存')
    editOpen.value = false
    loadList()
  } catch { /* handled */ }
}

function fmtTime(_r: any, _c: any, val: number) {
  return val ? new Date(val * 1000).toLocaleString('zh-CN') : '—'
}
</script>
