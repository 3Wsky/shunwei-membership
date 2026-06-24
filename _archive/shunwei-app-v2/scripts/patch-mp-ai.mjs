/**
 * 将 skills 分包同步到 uni-app 编译产物，并注入微信 AI 开发模式 app.json 配置。
 * 用法：node scripts/patch-mp-ai.mjs [dev|build]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const mode = process.argv[2] === 'build' ? 'build' : 'dev'
const OUT = path.join(ROOT, 'unpackage', 'dist', mode, 'mp-weixin')
const SKILLS_SRC = path.join(ROOT, 'skills')
const AGENTS_SRC = path.join(ROOT, 'AGENTS.md')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name)
    const d = path.join(dest, name)
    if (fs.statSync(s).isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(OUT)) {
  console.error(`[patch-mp-ai] 编译产物不存在: ${OUT}`)
  console.error('请先运行 npm run dev:mp-weixin 或 npm run build:mp-weixin')
  process.exit(1)
}

copyDir(SKILLS_SRC, path.join(OUT, 'skills'))
if (fs.existsSync(AGENTS_SRC)) {
  fs.copyFileSync(AGENTS_SRC, path.join(OUT, 'AGENTS.md'))
}

const pageMeta = {
  pages: [
    { path: 'pages/index/index', name: '首页', description: '会员首页，展示身份与快捷入口' },
    { path: 'pages/member/center', name: '会员中心', description: '查看会员等级、积分与开通套餐' },
    { path: 'pages/integral/index', name: '我的积分', description: '积分余额与明细' },
    { path: 'pages/integral/mall', name: '积分商城', description: '积分兑换商品' },
    { path: 'pages/voucher/wallet', name: '现金券钱包', description: '现金券余额与流水' }
  ]
}
fs.writeFileSync(path.join(OUT, 'page-meta.json'), JSON.stringify(pageMeta, null, 2), 'utf8')

const appJsonPath = path.join(OUT, 'app.json')
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))

app.lazyCodeLoading = 'requiredComponents'

const subRoot = 'skills'
const hasPkg = (app.subPackages || []).some((p) => p.root === subRoot)
if (!hasPkg) {
  app.subPackages = app.subPackages || []
  app.subPackages.push({ root: subRoot, pages: [], independent: true })
}

app.agent = {
  instruction: 'AGENTS.md',
  skills: [
    {
      name: 'membership-query',
      description: '会员与积分只读查询（等级、积分、套餐、现金券余额）',
      path: 'skills/membership-query'
    }
  ],
  pageMetadata: 'page-meta.json'
}

fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2), 'utf8')
console.log(`[patch-mp-ai] OK → ${OUT}`)
console.log('[patch-mp-ai] 请在微信开发者工具 Nightly 版切换「小程序 AI 编译」调试')
