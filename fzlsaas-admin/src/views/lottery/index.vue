<template>
  <PageShell title="新客抽奖">
    <template #actions>
      <el-button type="primary" @click="openRedeem">兑奖核销</el-button>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </template>

    <div v-loading="loading" class="kpi-grid">
      <StatCard type="member" icon="User" title="参与用户" :value="totals.userCount" hint="累计参与抽奖人数" />
      <StatCard type="newuser" icon="Ticket" title="总抽奖次数" :value="totals.totalRecords" hint="累计开奖记录" />
      <StatCard type="grant" icon="Present" title="中奖次数" :value="totals.wonRecords" :hint="winRateHint" />
      <StatCard type="verify" icon="Coin" title="剩余抽奖机会" :value="totals.totalChances" hint="用户未消耗的抽奖次数" />
    </div>

    <template #tabs>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="活动配置" name="config" />
        <el-tab-pane :label="`中奖记录(${records.length})`" name="records" />
      </el-tabs>
    </template>

    <div v-if="activeTab === 'config'" v-loading="loading">
      <template v-if="form">
        <section class="cfg-section">
          <div class="section-head">
            <span class="section-title">活动设置</span>
            <span class="section-desc">活动状态、每日次数与保底规则</span>
          </div>
          <el-form label-width="96px" class="cfg-form">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="活动名称">
                  <el-input v-model="form.activity.name" maxlength="40" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="活动状态">
                  <el-switch
                    v-model="form.activity.status"
                    active-value="enabled"
                    inactive-value="disabled"
                    active-text="进行中"
                    inactive-text="已停用"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="每日次数">
                  <el-input-number v-model="form.activity.dailyLimit" :min="0" :max="999" controls-position="right" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="活动说明">
                  <el-input v-model="form.activity.desc" maxlength="200" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="保底未中">
                  <el-input-number v-model="form.activity.guaranteeMisses" :min="0" :max="99" controls-position="right" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="保底奖品">
                  <el-select v-model="form.activity.guaranteePrizeId" style="width: 100%">
                    <el-option v-for="p in form.prizes" :key="p.id" :label="p.name" :value="p.id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <section class="cfg-section">
          <div class="section-head">
            <span class="section-title">任务赠送</span>
            <span class="section-desc">用户完成任务可获得抽奖机会</span>
          </div>
          <el-table :data="form.tasks" size="small" border>
            <el-table-column label="任务" width="120">
              <template #default="{ row }">{{ TASK_LABELS[row.id] || row.id }}</template>
            </el-table-column>
            <el-table-column label="标题" min-width="140">
              <template #default="{ row }"><el-input v-model="row.title" size="small" maxlength="40" /></template>
            </el-table-column>
            <el-table-column label="描述" min-width="200">
              <template #default="{ row }"><el-input v-model="row.desc" size="small" maxlength="100" /></template>
            </el-table-column>
            <el-table-column label="按钮文案" width="120">
              <template #default="{ row }"><el-input v-model="row.action" size="small" maxlength="12" /></template>
            </el-table-column>
            <el-table-column label="赠送次数" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.rewardChances" :min="1" :max="10" size="small" controls-position="right" style="width: 100px" />
              </template>
            </el-table-column>
            <el-table-column label="启用" width="80" align="center">
              <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
            </el-table-column>
            <el-table-column label="已领取" width="90" align="right" class-name="col-num">
              <template #default="{ row }">{{ taskStats[row.id]?.claimedCount ?? 0 }}</template>
            </el-table-column>
          </el-table>
        </section>

        <section class="cfg-section">
          <div class="section-head">
            <span class="section-title">奖品与概率</span>
            <span class="section-desc">概率由有效奖品权重实时计算（启用 + 权重&gt;0 + 有库存）</span>
          </div>
          <el-table :data="form.prizes" size="small" border>
            <el-table-column label="奖品名称" min-width="140">
              <template #default="{ row }"><el-input v-model="row.name" size="small" maxlength="30" /></template>
            </el-table-column>
            <el-table-column label="标签" min-width="120">
              <template #default="{ row }"><el-input v-model="row.tag" size="small" maxlength="30" /></template>
            </el-table-column>
            <el-table-column label="权重" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.weight" :min="0" :max="9999" size="small" controls-position="right" style="width: 100px" />
              </template>
            </el-table-column>
            <el-table-column label="概率" width="90" align="right" class-name="col-num">
              <template #default="{ row }">{{ formatPct(prizeStats[row.id]?.probability) }}</template>
            </el-table-column>
            <el-table-column label="库存" width="170" align="center">
              <template #default="{ row }">
                <div class="stock-cell">
                  <el-switch v-model="row._limited" size="small" @change="onStockToggle(row)" />
                  <el-input-number
                    v-if="row._limited"
                    v-model="row.stock"
                    :min="0"
                    :max="999999"
                    size="small"
                    controls-position="right"
                    style="width: 110px"
                  />
                  <span v-else class="text-muted">不限</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="每人限一次" width="100" align="center">
              <template #default="{ row }"><el-switch v-model="row.oncePerUser" size="small" /></template>
            </el-table-column>
            <el-table-column label="启用" width="72" align="center">
              <template #default="{ row }"><el-switch v-model="row.enabled" size="small" /></template>
            </el-table-column>
            <el-table-column label="已抽中" width="86" align="right" class-name="col-num">
              <template #default="{ row }">{{ prizeStats[row.id]?.drawCount ?? 0 }}</template>
            </el-table-column>
          </el-table>
        </section>

        <div class="save-bar">
          <span class="save-hint">最近更新：{{ fmtTime(form.updatedAt) }}</span>
          <el-button @click="load">还原</el-button>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        </div>
      </template>
    </div>

    <div v-else>
      <el-table :data="records" v-loading="loading" size="small">
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">{{ row.uid }}</template>
        </el-table-column>
        <el-table-column label="奖品" min-width="160">
          <template #default="{ row }">
            <div>{{ row.name || '—' }}</div>
            <div v-if="row.tag" class="sub-text">{{ row.tag }}</div>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="88" align="center">
          <template #default="{ row }">
            <el-tag :type="row.won ? 'success' : 'info'" size="small">{{ row.won ? '中奖' : '未中' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="兑奖码" width="130">
          <template #default="{ row }">{{ row.redeemCode || '—' }}</template>
        </el-table-column>
        <el-table-column label="发放状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.won" :type="fulfillTagType(row.fulfillment?.status)" size="small">
              {{ fulfillLabel(row.fulfillment?.status) }}
            </el-tag>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="兑奖" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="redeemTagType(row.redeemStatus)" size="small" effect="plain">
              {{ redeemLabel(row.redeemStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="抽奖时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.won" link type="primary" @click="openFulfill(row)">标记发放</el-button>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <template #empty>
          <TableEmpty icon="Present" title="暂无中奖记录" hint="用户在小程序参与新客抽奖后，中奖记录会在此展示并可处理发放。" />
        </template>
      </el-table>
    </div>
  </PageShell>

  <el-dialog v-model="redeemOpen" title="兑奖核销" width="420px" destroy-on-close>
    <el-form label-width="80px">
      <el-form-item label="兑奖码">
        <el-input v-model="redeemForm.code" placeholder="请输入用户出示的兑奖码" maxlength="32" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="redeemForm.note" placeholder="选填" maxlength="120" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="redeemOpen = false">取消</el-button>
      <el-button type="primary" :loading="redeeming" @click="submitRedeem">确认核销</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="fulfillOpen" title="标记发放" width="440px" destroy-on-close>
    <el-form v-if="fulfillRow" label-width="80px">
      <el-form-item label="奖品">{{ fulfillRow.name }}<span v-if="fulfillRow.tag" class="sub-text"> · {{ fulfillRow.tag }}</span></el-form-item>
      <el-form-item label="用户">{{ fulfillRow.uid }}</el-form-item>
      <el-form-item label="发放状态">
        <el-radio-group v-model="fulfillForm.status">
          <el-radio value="fulfilled">已发放</el-radio>
          <el-radio value="pending">待发放</el-radio>
          <el-radio value="void">作废</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="fulfillForm.note" placeholder="选填" maxlength="120" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="fulfillOpen = false">取消</el-button>
      <el-button type="primary" :loading="fulfilling" @click="submitFulfill">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageShell from '@/components/PageShell.vue'
import StatCard from '@/components/StatCard.vue'
import TableEmpty from '@/components/TableEmpty.vue'

interface Activity {
  name: string
  status: 'enabled' | 'disabled'
  desc: string
  dailyLimit: number
  guaranteeMisses: number
  guaranteePrizeId: string
}
interface TaskCfg {
  id: string
  title: string
  desc: string
  action: string
  enabled: boolean
  rewardChances: number
}
interface PrizeCfg {
  id: string
  name: string
  tag: string
  weight: number
  enabled: boolean
  stock: number | null
  oncePerUser: boolean
  _limited?: boolean
}
interface ConfigForm {
  activity: Activity
  tasks: TaskCfg[]
  prizes: PrizeCfg[]
  updatedAt?: string
}

const TASK_LABELS: Record<string, string> = { register: '注册', browse: '浏览', profile: '完善资料' }
const FULFILL_LABELS: Record<string, string> = { pending: '待发放', fulfilled: '已发放', void: '已作废' }
const REDEEM_LABELS: Record<string, string> = {
  pending: '待兑奖', redeemed: '已兑奖', void: '已作废', expired: '已过期', none: '—'
}

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('config')
const overview = ref<any>(null)
const form = ref<ConfigForm | null>(null)

const totals = computed(() => overview.value?.totals || { userCount: 0, totalRecords: 0, wonRecords: 0, totalChances: 0 })
const records = computed<any[]>(() => overview.value?.latestRecords || [])
const winRateHint = computed(() => {
  const t = totals.value
  if (!t.totalRecords) return '中奖率 —'
  return `中奖率 ${((t.wonRecords / t.totalRecords) * 100).toFixed(1)}%`
})
const prizeStats = computed<Record<string, any>>(() => {
  const map: Record<string, any> = {}
  for (const p of overview.value?.prizes || []) map[p.id] = p
  return map
})
const taskStats = computed<Record<string, any>>(() => {
  const map: Record<string, any> = {}
  for (const t of overview.value?.tasks || []) map[t.id] = t
  return map
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [ov, cfg] = await Promise.all([
      request.get('/api/admin/newcomer-lottery/overview'),
      request.get('/api/admin/newcomer-lottery/config')
    ])
    overview.value = ov
    form.value = {
      activity: { ...cfg.activity },
      tasks: (cfg.tasks || []).map((t: TaskCfg) => ({ ...t })),
      prizes: (cfg.prizes || []).map((p: PrizeCfg) => ({ ...p, _limited: p.stock !== null && p.stock !== undefined })),
      updatedAt: cfg.updatedAt
    }
  } catch { /* handled */ }
  finally { loading.value = false }
}

function onStockToggle(row: PrizeCfg) {
  row.stock = row._limited ? (typeof row.stock === 'number' ? row.stock : 0) : null
}

async function saveConfig() {
  if (!form.value) return
  saving.value = true
  try {
    const payload = {
      activity: form.value.activity,
      tasks: form.value.tasks.map((t) => ({
        id: t.id, title: t.title, desc: t.desc, action: t.action, enabled: t.enabled, rewardChances: t.rewardChances
      })),
      prizes: form.value.prizes.map((p) => ({
        id: p.id, name: p.name, tag: p.tag, weight: p.weight, enabled: p.enabled,
        stock: p._limited ? (typeof p.stock === 'number' ? p.stock : 0) : null,
        oncePerUser: p.oncePerUser
      }))
    }
    await request.put('/api/admin/newcomer-lottery/config', payload)
    ElMessage.success('配置已保存')
    await load()
  } catch { /* handled */ }
  finally { saving.value = false }
}

const redeemOpen = ref(false)
const redeeming = ref(false)
const redeemForm = ref({ code: '', note: '' })

function openRedeem() {
  redeemForm.value = { code: '', note: '' }
  redeemOpen.value = true
}

async function submitRedeem() {
  const code = redeemForm.value.code.trim()
  if (!code) {
    ElMessage.warning('请输入兑奖码')
    return
  }
  redeeming.value = true
  try {
    await request.post('/api/admin/newcomer-lottery/redeem', { code, note: redeemForm.value.note })
    ElMessage.success('核销成功')
    redeemOpen.value = false
    await load()
  } catch { /* handled */ }
  finally { redeeming.value = false }
}

const fulfillOpen = ref(false)
const fulfilling = ref(false)
const fulfillRow = ref<any>(null)
const fulfillForm = ref<{ status: 'pending' | 'fulfilled' | 'void'; note: string }>({ status: 'fulfilled', note: '' })

function openFulfill(row: any) {
  fulfillRow.value = row
  fulfillForm.value = {
    status: (row.fulfillment?.status === 'void' ? 'void' : row.fulfillment?.status === 'fulfilled' ? 'fulfilled' : 'pending'),
    note: row.fulfillment?.note || ''
  }
  fulfillOpen.value = true
}

async function submitFulfill() {
  if (!fulfillRow.value) return
  fulfilling.value = true
  try {
    await request.patch(`/api/admin/newcomer-lottery/records/${fulfillRow.value.id}/fulfillment`, {
      status: fulfillForm.value.status,
      note: fulfillForm.value.note
    })
    ElMessage.success('发放状态已更新')
    fulfillOpen.value = false
    await load()
  } catch { /* handled */ }
  finally { fulfilling.value = false }
}

function formatPct(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? `${n}%` : '0%'
}
function fmtTime(v?: string) {
  if (!v) return '—'
  try { return new Date(v).toLocaleString('zh-CN') } catch { return v }
}
function fulfillLabel(s?: string) { return FULFILL_LABELS[s || 'pending'] || '待发放' }
function fulfillTagType(s?: string) {
  if (s === 'fulfilled') return 'success'
  if (s === 'void') return 'info'
  return 'warning'
}
function redeemLabel(s?: string) { return REDEEM_LABELS[s || 'pending'] || '待兑奖' }
function redeemTagType(s?: string) {
  if (s === 'redeemed') return 'success'
  if (s === 'void' || s === 'expired') return 'info'
  return 'warning'
}
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}
@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
.cfg-section {
  margin-bottom: 22px;
}
.section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
}
.section-desc {
  font-size: 12px;
  color: var(--ink-400);
}
.cfg-form :deep(.el-form-item) {
  margin-bottom: 12px;
}
.stock-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.save-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.save-hint {
  margin-right: auto;
  font-size: 12px;
  color: var(--ink-400);
}
.sub-text {
  font-size: 12px;
  color: var(--ink-400);
}
.text-muted {
  color: var(--ink-300);
}
</style>
