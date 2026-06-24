import { swRequest } from './request'

export function getTierRules() {
  return swRequest('/api/approval/tier-rules')
}

export function matchTierRule(consumeAmount) {
  return swRequest('/api/approval/match', {
    method: 'POST',
    data: { consumeAmount },
  })
}

export function submitApproval(data) {
  return swRequest('/api/approval/submit', {
    method: 'POST',
    data,
  })
}

export function getApprovalTodos(role = 'manager') {
  return swRequest(`/api/approval/todos?role=${role}`)
}

export function managerReview(requestId, action, reason = '') {
  return swRequest('/api/approval/review/manager', {
    method: 'POST',
    data: { requestId, action, reason },
  })
}

export function adminReview(requestId, action, reason = '') {
  return swRequest('/api/approval/review/admin', {
    method: 'POST',
    data: { requestId, action, reason },
  })
}
