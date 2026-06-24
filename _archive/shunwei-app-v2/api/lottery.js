import { swRequest } from './request'

export function getLotteryState() {
  return swRequest('/api/newcomer-lottery/state')
}

export function claimLotteryTask(taskId) {
  return swRequest(`/api/newcomer-lottery/tasks/${encodeURIComponent(taskId)}/claim`, {
    method: 'POST',
  })
}

export function drawLottery() {
  return swRequest('/api/newcomer-lottery/draw', { method: 'POST' })
}

export function getLotteryRecords() {
  return swRequest('/api/newcomer-lottery/records')
}

export function getWinnerFeed() {
  return swRequest('/api/newcomer-lottery/winner-feed', { silent: true })
}
