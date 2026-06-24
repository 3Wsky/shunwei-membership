<template>
  <view class="lottery-page">
    <view v-if="pageLoadState === 'loading'" class="page-state-overlay page-loading">
      <view class="loading-skeleton">
        <view class="sk-circle" />
        <view class="sk-line sk-line-short" />
        <view class="sk-line sk-line-long" />
        <view class="sk-hint">加载抽奖活动中...</view>
      </view>
    </view>

    <view v-else-if="pageLoadState === 'error'" class="page-state-overlay page-error">
      <view class="error-card">
        <view class="error-icon">!</view>
        <view class="error-title">加载失败</view>
        <view class="error-desc">{{ loadErrorMsg }}</view>
        <button class="error-retry-btn" @tap="retryLoad">点击重试</button>
      </view>
    </view>

    <block v-else>
      <view class="lottery-bg" aria-hidden="true">
        <image class="lottery-bg-img lottery-bg-hero" src="/static/dazhuanpan/hero-bg.png" mode="widthFix" />
        <image class="lottery-bg-img lottery-bg-page" src="/static/dazhuanpan/page-bg.png" mode="widthFix" />
      </view>

      <view class="custom-nav" :style="{ paddingTop: statusBarHeight + 'px', height: navHeight + 'px' }">
        <view class="nav-inner">
          <view class="nav-back" @tap="onBack">‹</view>
          <view class="nav-title">新客抽奖</view>
        </view>
      </view>

      <view class="hero-stage">
        <view class="chance-text">
          <text>剩余抽奖次数</text>
          <text class="chance-num">{{ unlimitedDraw ? '∞' : chances }}</text>
        </view>
      </view>

      <view class="wheel-stage">
        <view
          class="wheel-disc"
          :style="{
            transform: `rotate(${wheelRotate}deg)`,
            transitionDuration: wheelTransition + 'ms',
          }"
        >
          <image class="wheel-face" src="/static/dazhuanpan/wheel-face.png" mode="widthFix" />
          <view
            v-for="item in wheelPrizes"
            :key="item.id"
            class="prize-slot"
            :style="{ transform: `rotate(${item.angle}deg) translateY(-${prizeRadius}rpx)` }"
          >
            <view
              class="prize-slot-inner"
              :style="{
                transform: `translate(-50%, -50%) rotate(${item.counterRotate}deg)`,
                transitionDuration: wheelTransition + 'ms',
              }"
            >
              <image class="prize-slot-img" :src="item.img" mode="aspectFit" />
            </view>
          </view>
        </view>
        <image class="wheel-ring" src="/static/dazhuanpan/wheel-ring.png" mode="widthFix" />
        <image class="wheel-pointer" src="/static/dazhuanpan/pointer-crop.png" mode="widthFix" />
        <button class="wheel-center-btn" :class="{ disabled: isDrawing }" :disabled="isDrawing" @tap="drawPrize">
          <image class="wheel-center-img" src="/static/dazhuanpan/draw-center-crop.png" mode="widthFix" />
        </button>
      </view>

      <view class="lottery-info">
        <view class="info-item">
          <image class="info-icon" src="/static/dazhuanpan/info-chance-crop.png" mode="widthFix" />
          <view>
            <view class="info-title">机会多多</view>
            <view class="info-desc">完成任务赢次数</view>
          </view>
        </view>
        <view class="info-dot" />
        <view class="info-item">
          <image class="info-icon" src="/static/dazhuanpan/title-gift-crop.png" mode="widthFix" />
          <view>
            <view class="info-title">奖品丰富</view>
            <view class="info-desc">优惠券/惊喜礼</view>
          </view>
        </view>
        <view class="info-dot" />
        <view class="info-item">
          <image class="info-icon" src="/static/dazhuanpan/info-luck-crop.png" mode="widthFix" />
          <view>
            <view class="info-title">好运加持</view>
            <view class="info-desc">快来试试手气吧</view>
          </view>
        </view>
      </view>

      <view v-if="winnerFeed.length" class="winner-ticker">
        <view class="ticker-label">中奖动态</view>
        <swiper class="ticker-swiper" vertical autoplay circular :interval="2600" :duration="420">
          <swiper-item v-for="item in winnerFeed" :key="item.id">
            <view class="ticker-line">
              <text class="ticker-name">{{ item.nickname }}</text>
              <text> 刚刚抽中了 </text>
              <text class="ticker-prize">{{ item.prizeName }}</text>
            </view>
          </swiper-item>
        </swiper>
      </view>

      <button v-if="!isDrawing" class="draw-btn" @tap="drawPrize">立即抽奖</button>

      <view class="record-card-wrap">
        <view class="record-card-head">
          <view class="record-title">我的中奖记录</view>
          <view class="record-count">{{ wonRecords.length }} 条</view>
        </view>
        <view v-if="wonRecords.length" class="record-list">
          <view v-for="item in wonRecords" :key="item.id" class="record-item">
            <view class="record-prize">
              <view class="record-title-row">
                <view class="record-name">{{ item.name }}</view>
                <view class="record-status" :class="item.redeemStatus">{{ item.redeemStatusText }}</view>
              </view>
              <view class="record-tag">{{ item.tag }}</view>
              <view v-if="item.redeemCode" class="record-code-row" @tap="copyRedeemCode(item.redeemCode)">
                <text class="record-code-label">兑换码</text>
                <text class="record-code">{{ item.redeemCode }}</text>
                <text class="record-copy">复制</text>
              </view>
              <view v-if="item.expiresText" class="record-expire">{{ item.expiresText }} 前有效，到店或联系客服核销</view>
            </view>
            <view class="record-time">{{ item.time }}</view>
          </view>
        </view>
        <view v-else class="record-empty">暂无中奖记录，先去试试手气</view>
      </view>

      <view class="task-card-wrap">
        <view class="task-card-head">
          <view class="task-header-text">做任务赢次数</view>
          <view class="task-progress-live">{{ doneTaskCount }}/{{ tasks.length }}</view>
        </view>
        <view class="task-list">
          <view v-for="item in tasks" :key="item.id" class="task-item" :class="{ done: item.done }">
            <view class="task-icon"><text class="task-char">礼</text></view>
            <view class="task-copy">
              <view class="task-name">{{ item.title }}</view>
              <view class="task-desc">{{ item.desc }}</view>
            </view>
            <button
              class="claim-btn"
              :class="{ done: item.done }"
              :disabled="item.done"
              @tap="completeTask(item.id)"
            >
              {{ item.done ? '已领' : '领取' }}
            </button>
          </view>
        </view>
        <view class="task-more">更多任务陆续开放，敬请期待～</view>
      </view>
    </block>

    <view v-if="showPrizePopup" class="prize-popup-mask" @touchmove.stop.prevent="noop">
      <scroll-view scroll-y class="prize-popup-scroll">
        <view class="prize-popup-panel" @tap.stop="noop">
          <image class="prize-popup-bg" src="/static/dazhuanpan/tanchuan/popup-card.png" mode="widthFix" />
          <image class="prize-popup-title-img" src="/static/dazhuanpan/tanchuan/popup-title.png" mode="widthFix" />
          <view class="prize-popup-close" @tap="closePrizePopup">×</view>
          <image class="popup-prize-icon" :src="prizePopup.icon" mode="aspectFit" />
          <view class="popup-result-line">
            <text class="popup-result-prefix">{{ prizePopup.prefix }}</text>
            <text class="popup-result-name">{{ prizePopup.name }}</text>
          </view>
          <view class="popup-desc">{{ prizePopup.desc }}</view>
          <view
            v-if="prizePopup.redeemCode"
            class="popup-code-box"
            @tap="copyRedeemCode(prizePopup.redeemCode)"
          >
            <view class="popup-code-label">核销兑换码</view>
            <view class="popup-code">{{ prizePopup.redeemCode }}</view>
            <view class="popup-code-tip">{{ prizePopup.expiresText }} 前有效，点击复制</view>
          </view>
          <view class="popup-primary-btn" :class="{ 'with-code': !!prizePopup.redeemCode }" @tap="handlePopupPrimary">
            <image class="popup-btn-img" src="/static/dazhuanpan/tanchuan/popup-primary.png" mode="widthFix" />
            <text class="popup-btn-text popup-btn-text-primary">{{ prizePopup.primaryText }}</text>
          </view>
          <view class="popup-secondary-btn" :class="{ 'with-code': !!prizePopup.redeemCode }" @tap="handlePopupSecondary">
            <image class="popup-btn-img" src="/static/dazhuanpan/tanchuan/popup-secondary.png" mode="widthFix" />
            <text class="popup-btn-text popup-btn-text-secondary">{{ prizePopup.secondaryText }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { claimLotteryTask, drawLottery, getLotteryState, getWinnerFeed } from '@/api/lottery'

const userStore = useUserStore()

const STORAGE_KEY = 'newcomer_lottery_state'
const PENDING_TASK_KEY = 'newcomer_lottery_pending_task'
const SPIN_SOUND_SRC = '/static/dazhuanpan/sfx-spin.mp3'
const WIN_SOUND_SRC = '/static/dazhuanpan/sfx-win.mp3'
const WHEEL_SPIN_DURATION = 5200
const WHEEL_RESULT_DELAY = 520

const WHEEL_PRIZE_CONFIG = [
  { id: 'thanks', img: '/static/dazhuanpan/prize-thanks-crop.png', angle: 0 },
  { id: 'coupon', img: '/static/dazhuanpan/prize-coupon-crop.png', angle: 51.428 },
  { id: 'mystery', img: '/static/dazhuanpan/prize-mystery-crop.png', angle: 102.856 },
  { id: 'newcomer', img: '/static/dazhuanpan/prize-newcomer-crop.png', angle: 154.284 },
  { id: 'heart', img: '/static/dazhuanpan/prize-heart-crop.png', angle: 205.712 },
  { id: 'surprise', img: '/static/dazhuanpan/jx-crop.png', angle: 257.14 },
  { id: 'again', img: '/static/dazhuanpan/prize-again-crop.png', angle: 308.568 },
]

const DEFAULT_TASKS = [
  { id: 'register', title: '完成新用户注册', desc: '首次注册后可领取 1 次机会', action: '领取', done: false },
  { id: 'browse', title: '浏览商品', desc: '浏览商品后即可解锁 1 次机会', action: '领取', done: false },
  { id: 'profile', title: '完善个人资料', desc: '补全资料即可解锁 1 次机会', action: '领取', done: false },
]

const DEFAULT_PRIZES = [
  { name: '谢谢参与', tag: '再接再厉', wheelIndex: 0 },
  { name: '购机优惠券', tag: '下单可用', wheelIndex: 1 },
  { name: '神秘大礼', tag: '惊喜好礼', wheelIndex: 2 },
  { name: '新客礼', tag: '新人专属', wheelIndex: 3 },
  { name: '感恩礼', tag: '福利礼包', wheelIndex: 4 },
  { name: '惊喜礼', tag: '随机掉落', wheelIndex: 5 },
  { name: '再来一次', tag: '好运加倍', wheelIndex: 6 },
]

const statusBarHeight = ref(20)
const navHeight = ref(64)
const chances = ref(0)
const unlimitedDraw = ref(false)
const isDrawing = ref(false)
const wheelRotate = ref(0)
const wheelTransition = ref(0)
const prizeRadius = ref(164)
const wheelPrizes = ref(buildWheelPrizes(0))
const pendingPrize = ref(null)
const showPrizePopup = ref(false)
const prizePopup = ref(defaultPopup())
const tasks = ref([...DEFAULT_TASKS])
const prizes = ref([...DEFAULT_PRIZES])
const records = ref([])
const wonRecords = ref([])
const winnerFeed = ref([])
const doneTaskCount = ref(0)
const pageLoadState = ref('loading')
const loadErrorMsg = ref('')

let spinAudio = null
let winAudio = null
let isPageVisible = true
let hasLoadedState = false
let pendingDrawResult = null
let drawFinishTimer = null
const claimingTasks = {}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  const menuButton = uni.getMenuButtonBoundingClientRect?.()
  statusBarHeight.value = info.statusBarHeight || 20
  navHeight.value = menuButton
    ? (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
    : 64

  restoreState()
  updateTaskCount()
  initAudio()
  loadLotteryState()
  loadWinnerFeed(true)
})

onShow(() => {
  isPageVisible = true
  const pendingTask = uni.getStorageSync(PENDING_TASK_KEY)
  if (!pendingTask) {
    if (hasLoadedState) loadLotteryState(true)
    return
  }
  uni.removeStorageSync(PENDING_TASK_KEY)
  if (pendingTask === 'browse') {
    grantTaskReward('browse')
    return
  }
  if (pendingTask === 'profile') {
    userStore.fetchUserInfo().then(() => {
      if (userStore.isLoggedIn && isProfileComplete()) grantTaskReward('profile')
      else uni.showToast({ title: '请先登录并完善头像昵称', icon: 'none' })
    })
    return
  }
  grantTaskReward(pendingTask)
})

onHide(() => {
  isPageVisible = false
  stopSpinSound()
})

onUnmounted(() => {
  isPageVisible = false
  if (drawFinishTimer) {
    clearTimeout(drawFinishTimer)
    drawFinishTimer = null
  }
  destroyAudio()
})

function buildWheelPrizes(rotate) {
  return WHEEL_PRIZE_CONFIG.map((item) => ({
    ...item,
    counterRotate: -(rotate + item.angle),
  }))
}

function defaultPopup() {
  return {
    headline: '恭喜中奖',
    icon: '/static/dazhuanpan/prize-coupon-crop.png',
    prefix: '获得',
    name: '购机优惠券',
    desc: '奖品已放入我的奖品，可前往查看使用',
    primaryText: '立即查看',
    secondaryText: '继续抽奖',
    won: true,
    redeemCode: '',
    expiresText: '',
  }
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}

async function loadLotteryState(silent = false) {
  if (!silent) {
    pageLoadState.value = 'loading'
    loadErrorMsg.value = ''
  }
  try {
    const state = await getLotteryState()
    hasLoadedState = true
    applyLotteryState(state)
    pageLoadState.value = 'ready'
    loadErrorMsg.value = ''
  } catch (err) {
    if (!silent) {
      pageLoadState.value = 'error'
      loadErrorMsg.value = err.message || '抽奖服务暂不可用，请检查网络后重试'
    }
  }
}

function retryLoad() {
  loadLotteryState()
  loadWinnerFeed(true)
}

async function loadWinnerFeed(silent = false) {
  try {
    const feed = await getWinnerFeed()
    winnerFeed.value = normalizeWinnerFeed(feed)
  } catch (err) {
    if (!silent) uni.showToast({ title: err.message || '中奖动态加载失败', icon: 'none' })
  }
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title || '',
    desc: task.desc || '',
    action: task.action || '领取',
    done: !!task.done,
  }
}

function normalizePrize(prize) {
  prize = prize || {}
  let wheelIndex = Number(prize.wheelIndex)
  if (!Number.isFinite(wheelIndex)) {
    wheelIndex = WHEEL_PRIZE_CONFIG.findIndex((item) => item.id === prize.id)
  }
  if (wheelIndex < 0) wheelIndex = 0
  const fallback = DEFAULT_PRIZES[wheelIndex] || DEFAULT_PRIZES[0]
  const config = WHEEL_PRIZE_CONFIG[wheelIndex] || WHEEL_PRIZE_CONFIG[0]
  return {
    id: prize.id || config.id,
    name: prize.name || fallback.name,
    tag: prize.tag || fallback.tag,
    wheelIndex,
  }
}

function getRedeemStatusText(status) {
  const textMap = {
    none: '无需兑换',
    pending: '待核销',
    redeemed: '已核销',
    expired: '已过期',
    void: '已作废',
  }
  return textMap[status] || '待核销'
}

function formatExpireTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatRecordTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return formatTime(date)
}

function formatTime(date) {
  return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(num) {
  return num < 10 ? `0${num}` : String(num)
}

function normalizeRecords(list) {
  if (!Array.isArray(list)) return []
  return list.map((record) => ({
    id: record.id || '',
    prizeId: record.prizeId || record.id || '',
    name: record.name || '',
    tag: record.tag || '',
    wheelIndex: Number.isFinite(Number(record.wheelIndex)) ? Number(record.wheelIndex) : 0,
    won: record.won !== false,
    redeemCode: record.redeemCode || '',
    redeemStatus: record.redeemStatus || (record.won === false ? 'none' : 'pending'),
    redeemStatusText: getRedeemStatusText(record.redeemStatus || (record.won === false ? 'none' : 'pending')),
    expiresAt: record.expiresAt || '',
    expiresText: record.expiresAt ? formatExpireTime(record.expiresAt) : '',
    time: record.time || formatRecordTime(record.createdAt),
  })).slice(0, 20)
}

function maskNickname(nickname) {
  const text = String(nickname || '').trim()
  if (!text) return '微信用户'
  if (text.length <= 1) return `${text}*`
  if (text.length === 2) return `${text.charAt(0)}*`
  return `${text.charAt(0)}**${text.charAt(text.length - 1)}`
}

function normalizeWinnerFeed(list) {
  if (!Array.isArray(list)) return []
  return list.map((record) => ({
    id: record.id || '',
    nickname: maskNickname(record.nickname || '微信用户'),
    prizeName: record.prizeName || record.name || '',
    tag: record.tag || '',
    time: formatRecordTime(record.createdAt),
  })).filter((record) => record.prizeName).slice(0, 20)
}

function getDoneTaskCount(list) {
  return list.filter((task) => task.done).length
}

function buildStatePatch(state) {
  state = state || {}
  let nextChances = Number(state.chances)
  if (!Number.isFinite(nextChances)) nextChances = 0
  const nextTasks = Array.isArray(state.tasks) && state.tasks.length
    ? state.tasks.map(normalizeTask)
    : tasks.value
  const nextPrizes = Array.isArray(state.prizes) && state.prizes.length
    ? state.prizes.map(normalizePrize)
    : prizes.value
  const nextRecords = normalizeRecords(state.records)
  return {
    chances: nextChances,
    unlimitedDraw: !!state.unlimitedDraw,
    tasks: nextTasks,
    prizes: nextPrizes,
    records: nextRecords,
    wonRecords: nextRecords.filter((record) => record.won),
    doneTaskCount: Number.isFinite(Number(state.doneTaskCount))
      ? Number(state.doneTaskCount)
      : getDoneTaskCount(nextTasks),
  }
}

function applyLotteryState(state) {
  const patch = buildStatePatch(state)
  chances.value = patch.chances
  unlimitedDraw.value = patch.unlimitedDraw
  tasks.value = patch.tasks
  prizes.value = patch.prizes
  records.value = patch.records
  wonRecords.value = patch.wonRecords
  doneTaskCount.value = patch.doneTaskCount
  saveState()
}

function restoreState() {
  const saved = uni.getStorageSync(STORAGE_KEY)
  if (!saved) return
  const savedRecords = Array.isArray(saved.records) ? saved.records : []
  tasks.value = DEFAULT_TASKS.map((task) => ({
    ...task,
    done: saved.doneTasks?.includes(task.id),
  }))
  chances.value = typeof saved.chances === 'number' ? saved.chances : 0
  records.value = savedRecords
  wonRecords.value = savedRecords.filter((record) => record.won)
  updateTaskCount()
}

function updateTaskCount() {
  doneTaskCount.value = getDoneTaskCount(tasks.value)
}

function saveState() {
  uni.setStorageSync(STORAGE_KEY, {
    chances: chances.value,
    records: records.value,
    doneTasks: tasks.value.filter((task) => task.done).map((task) => task.id),
  })
}

function findTask(id) {
  return tasks.value.find((task) => task.id === id)
}

function isProfileComplete() {
  const name = userStore.nickname
  return !!name && name !== '未登录' && name !== '微信用户'
}

function completeTask(id) {
  const task = findTask(id)
  if (!task || task.done) return
  if (id === 'browse') {
    uni.setStorageSync(PENDING_TASK_KEY, id)
    uni.switchTab({ url: '/pages/goods_cate/index' })
    return
  }
  if (id === 'profile') {
    if (!userStore.isLoggedIn) {
      uni.setStorageSync(PENDING_TASK_KEY, id)
      uni.navigateTo({ url: '/pages/login/index' })
      return
    }
    if (isProfileComplete()) {
      grantTaskReward(id)
      return
    }
    uni.setStorageSync(PENDING_TASK_KEY, id)
    uni.switchTab({ url: '/pages/user/index' })
    uni.showToast({ title: '请完善头像与昵称', icon: 'none' })
    return
  }
  grantTaskReward(id)
}

async function grantTaskReward(id) {
  const task = findTask(id)
  if (!task || task.done || claimingTasks[id]) return
  claimingTasks[id] = true
  const toastMap = {
    browse: '已领取浏览奖励',
    profile: '已领取完善资料奖励',
    register: '新客奖励已领取',
  }
  try {
    const state = await claimLotteryTask(id)
    applyLotteryState(state)
    uni.showToast({ title: toastMap[id] || '领取成功', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: err.message || '领取失败', icon: 'none' })
    loadLotteryState(true)
  } finally {
    claimingTasks[id] = false
  }
}

async function drawPrize() {
  if (isDrawing.value) return
  if (!unlimitedDraw.value && chances.value <= 0) {
    uni.showToast({ title: '先完成任务获取次数', icon: 'none' })
    return
  }
  pendingDrawResult = null
  isDrawing.value = true
  pendingPrize.value = null
  playSpinSound()
  try {
    const result = await drawLottery()
    const prize = normalizePrize(result?.prize)
    pendingDrawResult = result || {}
    spinToPrize(prize)
  } catch (err) {
    stopSpinSound()
    pendingDrawResult = null
    isDrawing.value = false
    pendingPrize.value = null
    uni.showToast({ title: err.message || '抽奖失败', icon: 'none' })
    loadLotteryState(true)
  }
}

function spinToPrize(prize) {
  const segment = 360 / prizes.value.length
  const currentRotate = wheelRotate.value || 0
  const currentRoundBase = Math.ceil(currentRotate / 360) * 360
  const targetAngle = 360 - prize.wheelIndex * segment
  const nextRotate = currentRoundBase + 360 * 8 + targetAngle

  if (drawFinishTimer) {
    clearTimeout(drawFinishTimer)
    drawFinishTimer = null
  }

  setTimeout(() => {
    wheelTransition.value = WHEEL_SPIN_DURATION
    wheelRotate.value = nextRotate
    wheelPrizes.value = buildWheelPrizes(nextRotate)
    pendingPrize.value = prize
  }, 30)

  drawFinishTimer = setTimeout(() => {
    finishDrawPrize()
  }, WHEEL_SPIN_DURATION + WHEEL_RESULT_DELAY)
}

function finishDrawPrize() {
  if (!isDrawing.value) return
  stopSpinSound()
  const prize = pendingPrize.value || pickPrize()
  const drawResult = pendingDrawResult || {}
  let patch = drawResult.state ? buildStatePatch(drawResult.state) : null

  if (!patch) {
    const record = {
      name: prize.name,
      tag: prize.tag,
      wheelIndex: prize.wheelIndex,
      won: prize.id !== 'thanks',
      time: formatTime(new Date()),
    }
    patch = {
      chances: Number.isFinite(Number(drawResult.chances))
        ? Number(drawResult.chances)
        : Math.max(0, chances.value - 1),
      records: drawResult.records ? normalizeRecords(drawResult.records) : [record, ...records.value].slice(0, 20),
      tasks: tasks.value,
      prizes: prizes.value,
    }
    patch.wonRecords = patch.records.filter((record) => record.won)
  }

  chances.value = patch.chances
  if (patch.unlimitedDraw !== undefined) unlimitedDraw.value = patch.unlimitedDraw
  if (patch.tasks) tasks.value = patch.tasks
  if (patch.prizes) prizes.value = patch.prizes
  records.value = patch.records
  wonRecords.value = patch.wonRecords || patch.records.filter((record) => record.won)
  doneTaskCount.value = patch.doneTaskCount ?? getDoneTaskCount(tasks.value)
  isDrawing.value = false
  pendingPrize.value = null
  prizePopup.value = buildPrizePopup(prize, drawResult)
  showPrizePopup.value = true
  pendingDrawResult = null
  drawFinishTimer = null
  saveState()
  playWinSound()
  loadWinnerFeed(true)
}

function pickPrize() {
  return prizes.value[0] || { id: 'thanks', name: '谢谢参与', tag: '再接再厉', wheelIndex: 0 }
}

function getLatestDrawRecord(drawResult) {
  let list = []
  if (drawResult?.state?.records) list = drawResult.state.records
  else if (Array.isArray(drawResult?.records)) list = drawResult.records
  if (!list.length) return null
  return normalizeRecords([list[0]])[0] || null
}

function buildPrizePopup(prize, drawResult) {
  const isThanks = prize.name === '谢谢参与'
  const isAgain = prize.name === '再来一次'
  const prizeConfig = WHEEL_PRIZE_CONFIG[prize.wheelIndex] || WHEEL_PRIZE_CONFIG[0]
  const latestRecord = getLatestDrawRecord(drawResult)
  return {
    headline: isThanks ? '再接再厉' : '恭喜中奖',
    icon: prizeConfig.img,
    prefix: isThanks ? '本次' : '获得',
    name: prize.name,
    desc: isThanks
      ? '好运正在路上，再试一次吧'
      : (isAgain ? '额外机会已送达，马上继续试手气' : '奖品已放入我的奖品，可前往查看使用'),
    primaryText: isThanks ? '再试一次' : '立即查看',
    secondaryText: isThanks ? '稍后再说' : '继续抽奖',
    won: !isThanks,
    redeemCode: latestRecord?.redeemCode || '',
    expiresText: latestRecord?.expiresText || '',
  }
}

function copyRedeemCode(code) {
  if (!code) return
  uni.setClipboardData({
    data: code,
    success() {
      uni.showToast({ title: '兑换码已复制', icon: 'success' })
    },
  })
}

function closePrizePopup() {
  showPrizePopup.value = false
}

function handlePopupPrimary() {
  if (!prizePopup.value.won) {
    continueDrawFromPopup()
    return
  }
  closePrizePopup()
  uni.showToast({ title: '奖品已放入我的奖品', icon: 'none' })
}

function handlePopupSecondary() {
  if (!prizePopup.value.won) {
    closePrizePopup()
    return
  }
  continueDrawFromPopup()
}

function continueDrawFromPopup() {
  showPrizePopup.value = false
  setTimeout(() => drawPrize(), 160)
}

function noop() {}

function initAudio() {
  if (uni.setInnerAudioOption) {
    uni.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true })
  }
  getAudioContext('spin')
  getAudioContext('win')
}

function getAudioContext(type) {
  if (!uni.createInnerAudioContext) return null
  const isSpin = type === 'spin'
  const key = isSpin ? 'spinAudio' : 'winAudio'
  const current = isSpin ? spinAudio : winAudio
  if (current) return current
  const audio = uni.createInnerAudioContext()
  audio.loop = isSpin
  audio.volume = isSpin ? 0.9 : 1
  audio.obeyMuteSwitch = false
  audio.src = isSpin ? SPIN_SOUND_SRC : WIN_SOUND_SRC
  if (isSpin) spinAudio = audio
  else winAudio = audio
  return audio
}

function playSpinSound() {
  const audio = getAudioContext('spin')
  if (!audio) return
  try { audio.stop() } catch { /* ignore */ }
  try { audio.seek(0) } catch { /* ignore */ }
  try { audio.play() } catch { /* ignore */ }
}

function stopSpinSound() {
  if (!spinAudio) return
  try { spinAudio.stop() } catch { /* ignore */ }
}

function playWinSound() {
  if (!isPageVisible) return
  const audio = getAudioContext('win')
  if (!audio) return
  try { audio.stop() } catch { /* ignore */ }
  try { audio.seek(0) } catch { /* ignore */ }
  try { audio.play() } catch { /* ignore */ }
}

function destroyAudio() {
  stopSpinSound()
  if (spinAudio) {
    try { spinAudio.destroy() } catch { /* ignore */ }
    spinAudio = null
  }
  if (winAudio) {
    try { winAudio.stop() } catch { /* ignore */ }
    try { winAudio.destroy() } catch { /* ignore */ }
    winAudio = null
  }
}
</script>

<style lang="scss" scoped>
@import './lottery.scss';
</style>
