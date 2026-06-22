import { swRequest } from './request'

export function verifyOrder(orderId) {
  return swRequest('/api/staff/integral-mall/verify', {
    method: 'POST',
    data: { orderId },
  })
}

export function getCustomerBenefits(uid) {
  return swRequest(`/api/staff/customer/${uid}/benefits`)
}

export function getStaffInfo() {
  return swRequest('/api/staff/me')
}

export function getVerifyHistory(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return swRequest(`/api/staff/verify-history${qs ? '?' + qs : ''}`)
}

export function getStaffCard(staffUid) {
  return swRequest(`/api/staff/${staffUid}/card`)
}

export function bindStaffSpread(staffUid) {
  return swRequest('/api/staff/bind-spread', {
    method: 'POST',
    data: { staffUid },
  })
}

export function getStaffStats() {
  return swRequest('/api/staff/stats')
}

export function getStaffMembers(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.keyword) query.set('keyword', params.keyword)
  const qs = query.toString()
  return swRequest(`/api/staff/members${qs ? '?' + qs : ''}`)
}

export function getTierOptions() {
  return swRequest('/api/approval/tier-options')
}
