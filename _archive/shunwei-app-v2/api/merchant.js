import { swRequest } from './request'

export function getMerchantAccess() {
  return swRequest('/api/merchant/access', { silent: true })
}

export function getMerchantDashboard() {
  return swRequest('/api/merchant/dashboard')
}

export function getMerchantWithdrawals() {
  return swRequest('/api/merchant/withdrawals')
}

export function submitWithdrawal(data) {
  return swRequest('/api/merchant/withdrawals', {
    method: 'POST',
    data,
  })
}
