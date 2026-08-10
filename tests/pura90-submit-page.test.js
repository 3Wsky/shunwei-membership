const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const pagePath = path.join(repoRoot, 'new/routine/pages/jingcheng/staff/apply.js')
const requestPath = path.join(repoRoot, 'new/routine/services/jc-request.js')
const recognisePath = path.join(repoRoot, 'new/routine/services/sn-recognise.js')
const flagsPath = path.join(repoRoot, 'new/routine/services/feature-flags.js')

let requestImpl = () => Promise.resolve(null)
let pageDefinition = null

require.cache[requestPath] = {
  id: requestPath,
  filename: requestPath,
  loaded: true,
  exports: {
    request: (...args) => requestImpl(...args),
    getToken: () => 'test-token',
    BASE_URL: 'https://example.test'
  }
}
require.cache[recognisePath] = {
  id: recognisePath,
  filename: recognisePath,
  loaded: true,
  exports: { recogniseSn: () => Promise.resolve({}) }
}
require.cache[flagsPath] = {
  id: flagsPath,
  filename: flagsPath,
  loaded: true,
  exports: { OCR_SN_SCAN_ENABLED: false }
}

const wxCalls = { toast: [], modal: [], loading: 0, hideLoading: 0 }
global.wx = {
  showToast(options) { wxCalls.toast.push(options) },
  showModal(options) { wxCalls.modal.push(options) },
  showLoading() { wxCalls.loading += 1 },
  hideLoading() { wxCalls.hideLoading += 1 },
  navigateBack() {},
  chooseMedia() {}
}
global.Page = (definition) => { pageDefinition = definition }
require(pagePath)

function resetCalls() {
  wxCalls.toast.length = 0
  wxCalls.modal.length = 0
  wxCalls.loading = 0
  wxCalls.hideLoading = 0
}

function createPage(data = {}) {
  const page = Object.assign({}, pageDefinition)
  page.data = Object.assign({}, JSON.parse(JSON.stringify(pageDefinition.data)), data)
  page.setData = (patch) => Object.assign(page.data, patch)
  return page
}

function validPuraData(overrides = {}) {
  return Object.assign({
    rules: [{ id: 'PURA90_42W', minAmount: 0, maxAmount: null, giftIntegral: 420000 }],
    selectedIndex: 0,
    program: { mode: 'pura90_42w' },
    member: { uid: 123 },
    submitting: false,
    products: [{
      type: '手机',
      model: 'HUAWEI Pura 90',
      imei: '862078086049494',
      sn: '',
      price: '5999',
      catalogPrice: 0,
      verified: true,
      checking: false
    }]
  }, overrides)
}

test.beforeEach(() => {
  resetCalls()
  requestImpl = () => Promise.resolve(null)
})

test('档位丢失时不再静默，给出明确提示', () => {
  const page = createPage(validPuraData({ rules: [], selectedIndex: -1 }))
  page.submit()
  assert.equal(wxCalls.toast.at(-1).title, '审批档位未加载，请退出重进')
})

test('重复点击时不再静默，提示正在提交', () => {
  const page = createPage(validPuraData({ submitting: true }))
  page.submit()
  assert.equal(wxCalls.toast.at(-1).title, '正在提交，请稍候')
})

test('Pura 90 未核对状态会在提交时重新查库，命中后继续提交', async () => {
  const page = createPage(validPuraData())
  page.data.products[0].verified = false
  let submitted = 0
  page.doSubmit = () => { submitted += 1 }
  requestImpl = (url) => {
    assert.equal(url, '/api/staff/sn-lookup')
    return Promise.resolve({ found: true, used: false, model: 'HUAWEI Pura 90', price: 5999 })
  }

  page.submit()
  await new Promise((resolve) => setTimeout(resolve, 10))

  assert.equal(page.data.products[0].verified, true)
  assert.equal(submitted, 1)
})

test('提交接口失败后强制解锁按钮并显示失败原因', async () => {
  const page = createPage(validPuraData())
  requestImpl = () => Promise.reject(new Error('该会员已有待审批申请'))

  page.doSubmit(page.data.products, page.data.rules[0], 5999)
  await new Promise((resolve) => setTimeout(resolve, 10))

  assert.equal(page.data.submitting, false)
  assert.equal(wxCalls.modal.at(-1).title, '提交失败')
  assert.equal(wxCalls.modal.at(-1).content, '该会员已有待审批申请')
})

test('提交按钮使用独立点击拦截并展示提交中状态', () => {
  const wxml = fs.readFileSync(
    path.join(repoRoot, 'new/routine/pages/jingcheng/staff/apply.wxml'),
    'utf8'
  )
  assert.match(wxml, /catchtap="submit"/)
  assert.match(wxml, /submitting \? '正在提交…' : '提交申请'/)
})
