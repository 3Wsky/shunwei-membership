import { swRequest } from './request'

/** 小程序入口可见性（员工工作台 / 商家核销） */
export function getEntryConfig() {
  return swRequest('/api/miniapp/entry-config', { silent: true })
}
