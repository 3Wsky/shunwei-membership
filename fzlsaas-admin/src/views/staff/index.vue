<template>
  <PageShell title="店员管理">
    <template #filter>
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="搜索">
          <el-input v-model="keyword" placeholder="UID/手机/昵称" clearable style="width:200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="keyword = ''; search()">重置</el-button>
        </el-form-item>
      </el-form>
    </template>

    <el-table :data="pagedList" v-loading="loading">
      <el-table-column prop="uid" label="UID" width="80" />
      <el-table-column prop="nickname" label="姓名" />
      <el-table-column prop="divisionName" label="门店" />
      <el-table-column prop="memberCount" label="发展会员" width="100" />
      <el-table-column prop="pendingApproval" label="待审批" width="90" />
      <el-table-column label="名片" width="90">
        <template #default="{ row }">
          <el-tag :type="row.cardConfigured ? 'success' : 'info'" size="small">
            {{ row.cardConfigured ? '已配置' : '未配置' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.uid)">详情/名片</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <TableEmpty icon="Avatar" title="暂无店员" hint="在会员详情中为用户授予店长 / 店员角色后，会出现在这里。" />
      </template>
    </el-table>

    <template #footer>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="list.length"
        :page-sizes="[20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="onSizeChange"
      />
    </template>
  </PageShell>

  <el-drawer v-model="drawerOpen" :title="`店员 #${selectedUid}`" size="560px">
    <el-tabs v-model="tab">
      <el-tab-pane label="统计" name="stats">
        <p>发展会员：{{ stats?.memberCount ?? 0 }}</p>
        <p>待审批：{{ stats?.approvalStats?.pending ?? 0 }} / 已通过：{{ stats?.approvalStats?.approved ?? 0 }}</p>
      </el-tab-pane>
      <el-tab-pane label="名片配置" name="card">
        <el-form :model="cardForm" label-width="90px">
          <el-form-item label="展示名"><el-input v-model="cardForm.displayName" /></el-form-item>
          <el-form-item label="职位"><el-input v-model="cardForm.jobTitle" /></el-form-item>
          <el-form-item label="简介"><el-input v-model="cardForm.bio" type="textarea" /></el-form-item>
          <el-form-item label="门店名"><el-input v-model="cardForm.storeName" /></el-form-item>
          <el-form-item label="地址"><el-input v-model="cardForm.storeAddress" /></el-form-item>
          <el-form-item label="电话"><el-input v-model="cardForm.storePhone" /></el-form-item>
          <el-form-item label="营业时间"><el-input v-model="cardForm.businessHours" /></el-form-item>
          <el-form-item label="发布"><el-switch v-model="cardForm.isPublished" /></el-form-item>
          <el-button type="primary" @click="saveCard">保存名片</el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageShell from '@/components/PageShell.vue'
import TableEmpty from '@/components/TableEmpty.vue'

const loading = ref(false)
const list = ref<any[]>([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const drawerOpen = ref(false)
const selectedUid = ref<number | null>(null)
const tab = ref('stats')
const stats = ref<any>(null)
const cardForm = ref<any>({
  displayName: '', jobTitle: '', bio: '', storeName: '', storeAddress: '',
  storePhone: '', businessHours: '', isPublished: true
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return list.value.slice(start, start + pageSize.value)
})

onMounted(() => loadList())

async function loadList() {
  loading.value = true
  try {
    const data = await request.get('/api/admin/staff/list', { params: { keyword: keyword.value || undefined } })
    list.value = data?.list || []
  } catch { list.value = [] }
  finally { loading.value = false }
}

function search() {
  page.value = 1
  loadList()
}

function onSizeChange() {
  page.value = 1
}

async function openDetail(uid: number) {
  selectedUid.value = uid
  drawerOpen.value = true
  tab.value = 'stats'
  stats.value = await request.get(`/api/admin/staff/${uid}/stats`).catch(() => null)
  const card = await request.get(`/api/admin/staff/${uid}/card`).catch(() => ({}))
  cardForm.value = { ...cardForm.value, ...card }
}

async function saveCard() {
  if (!selectedUid.value) return
  try {
    await request.put(`/api/admin/staff/${selectedUid.value}/card`, cardForm.value)
    ElMessage.success('名片已保存')
    loadList()
  } catch { /* handled */ }
}
</script>
