# 上线部署 + 微信支付 方案

> 重构系统 shunwei-app-v2(小程序) + shunwei-api(后端) 的生产上线指南。
> 当前功能 P1-P5 已全部完成(17页/30+接口);剩「微信支付联调」+「生产部署」。

---

## 一、微信支付（方案甲：经 CRMEB 网关）

### 现状
- 商户号 mch_id：**1704962241**（用户已提供）
- 本地库 `eb_system_config` 的支付凭证为空（生产服务器才有真实配置）
- `pay_weixin_open = weixin`（生产已启用微信支付）

### 需要补齐的支付凭证（mch_id 不够）
微信支付 v3 下单需要**完整凭证**，请从生产 CRMEB 后台 / 微信商户平台获取：
| 凭证 | 用途 | 来源 |
|------|------|------|
| ✅ mch_id `1704962241` | 商户号 | 已提供 |
| ❌ **APIv3 密钥** | v3 签名/回调解密 | 微信商户平台→API安全 |
| ❌ **商户 API 证书**(apiclient_cert.pem / apiclient_key.pem) | 下单签名 | 商户平台下载 |
| ❌ **证书序列号** | v3 请求头 | 证书信息 |
| ❌ 小程序 **AppSecret** | 下单需 | 微信公众平台(或已在 CRMEB 配置) |

### 两种实现路径
**路径甲-1（推荐，最省）**：复用 CRMEB 生产的支付下单
- 会员购卡 / 积分充值，调用生产 CRMEB 已有的下单接口（CRMEB 后台已配好上述凭证），拿到 `prepay_id` → 小程序 `uni.requestPayment`
- 支付成功后，CRMEB 回调 → 调 shunwei-api `pay-callback`（已实现）→ 发会员/积分
- **优点**：不用把证书放进 shunwei-api，复用 CRMEB 已配置；**缺点**：需确认 CRMEB 对应下单接口路径与参数

**路径甲-2**：shunwei-api 直连微信支付 v3
- 在 shunwei-api 配置 mch_id + APIv3密钥 + 证书，自建下单 + 回调
- **优点**：完全自管；**缺点**：需把证书部署到 shunwei-api 服务器，工作量大

> 建议先走**甲-1**：把会员购卡当作 CRMEB 的「付费会员/充值」订单走，支付闭环复用生产 CRMEB。需要你提供：生产能用的购卡/充值下单接口，或确认用 CRMEB 付费会员体系。

---

## 二、生产部署 Runbook

### 架构
```
小程序(shunwei-app-v2 编译产物) ──→ 微信审核发布
        │ 业务接口
        ▼
shunwei-api(Node20+Fastify) ── 部署到生产服务器(PM2) ── Nginx 反代
        │
        ▼
生产 MySQL so1988_shunwei(已有1770用户) ── 跑 sw_* 迁移
        │ 登录/支付
        ▼
CRMEB 生产 ok.xjshunwei.cn(微信网关)
```

### 步骤
**0. 前置（不可跳过）**
- [ ] 生产数据库**全量备份**（mysqldump）

**1. 生产库执行 sw_* 迁移**（新表，不动旧数据）
```bash
# MVP1 + MVP2 + MVP3 全部 sw_ 表（按顺序，幂等 CREATE TABLE IF NOT EXISTS）
mysql -u<user> -p so1988_shunwei < migrations/mvp1/001_sw_system_config.sql
mysql ... < migrations/mvp1/002_sw_integral_batch.sql
mysql ... < migrations/mvp1/003_sw_user_membership.sql
mysql ... < migrations/mvp1/004_sw_integral_mall.sql
mysql ... < migrations/mvp1/005_eb_member_ship_seed.sql
mysql ... < migrations/mvp2/001_sw_approval.sql
mysql ... < migrations/mvp2/002_sw_tier_rules.sql
mysql ... < migrations/mvp2/003_sw_store_manager.sql
mysql ... < migrations/mvp3/001_sw_cash_voucher.sql
mysql ... < migrations/mvp3/002_sw_merchant.sql
mysql ... < migrations/mvp3/003_sw_integral_recharge.sql
mysql ... < migrations/admin-r1/001_sw_admin_audit_log.sql
```

**1.5 历史数据回填**（公网部署同一维护窗口，见 `docs/MEMBER_HISTORY_MIGRATION_PLAN.md`）
```bash
cd CMB/shunwei-api
# 方式 A：Node 脚本（推荐，含执行前后统计）
node scripts/run-backfill.js        # 仅检查
node scripts/run-backfill.js --run  # 执行回填

# 方式 B：直接 SQL
mysql -u<user> -p so1988_shunwei < migrations/backfill/001_legacy_member_backfill.sql
```

**回填规则（用户拍板）**：
- 积分：`eb_user.integral` → `sw_integral_batch`（`legacy_import` 批次，幂等）
- 会员：仅 `eb_other_order` 中 `pay_price≥199` 且未过期才写入；无明确订单 → 默认无会员，超管后期 FZLSaas 手动发放

**本地验证参考**（2026-06-20）：554 条积分批次、0 条会员、0 积分不一致用户。

**2. 部署 shunwei-api**
- [ ] 服务器装 Node 20 + PM2
- [ ] 上传 `CMB/shunwei-api`，`npm ci --omit=dev`
- [ ] 写生产 `.env`：CRMEB_DB_*（生产库）、CRMEB_APP_KEY（与生产 crmeb 一致）、ADMIN_* 强密码、SHUNWEI_INTERNAL_TOKEN
- [ ] PM2 启动（推荐用仓库内 `ecosystem.config.cjs`）：
```bash
cd /www/wwwroot/shunwei-api   # 按实际路径
cp .env.example .env          # 编辑生产变量
npm ci --omit=dev
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup                     # 按提示执行，开机自启
# 更新代码后
pm2 reload shunwei-api --update-env
# 或 npm run pm2:reload
```
- [ ] Nginx 反代示例（子域 `api.xjshunwei.cn`）：
```nginx
server {
    listen 443 ssl http2;
    server_name api.xjshunwei.cn;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
- [ ] 或复用主域路径前缀（小程序 `SHUNWEI_API` 填 `https://ok.xjshunwei.cn/sw-api`）：
```nginx
location /sw-api/ {
    proxy_pass http://127.0.0.1:8787/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
- [ ] 部署 **fzlsaas-admin**（静态 dist）：
```bash
cd fzlsaas-admin && npm ci && npm run build
# 将 dist/ 挂到 Nginx，如 https://admin.xjshunwei.cn 或 /admin-spa/
```

**3. 小程序指向生产**
- [ ] `shunwei-app-v2/config/index.js` 的 `prod.SHUNWEI_API` 改为生产 shunwei-api 地址（HTTPS 合法域名）
- [ ] 微信公众平台配置 request 合法域名（CRMEB 域名 + shunwei-api 域名）
- [ ] HBuilderX 发行 → 微信小程序 → 上传 → 提交审核 → 发布

**4. 验收**
- [ ] 真机：登录 / 首页 / 会员 / 积分 / 商城 / 现金券 / 审批 全链路
- [ ] 支付：购卡 / 充值真实付款 + 到账

### 需要你提供
1. **服务器访问**（SSH / 宝塔）— 部署 shunwei-api（Agent 无服务器权，需你或运维执行，Agent 可给全部命令）
2. **微信支付凭证**（见上：APIv3密钥 + 证书 + 序列号）
3. **shunwei-api 生产域名**（建议独立子域 + HTTPS 证书）
4. 生产 `crmeb/.env` 的 **APP_KEY**（小程序 JWT 校验需与生产一致）

**APP_KEY 核对（上线前必做）**
```bash
# 1) 生产 CRMEB 配置（宝塔/SSH 查看 crmeb/.env 或 eb_system_config）
grep APP_KEY /path/to/crmeb/.env

# 2) shunwei-api 生产 .env 必须相同
CRMEB_APP_KEY=<与 CRMEB 完全一致>

# 3) 用真机登录后拿 token，调需鉴权接口应 200 而非 401
curl -H "Authori-zation: Bearer <SW_TOKEN>" https://<api域名>/api/membership/me
```

---

## 三、当前可立即做 vs 需你配合
| 事项 | 状态 |
|------|------|
| 全部业务功能(17页/30+接口) | ✅ 完成 |
| sw_* 迁移脚本 | ✅ 就绪(本地已验证) |
| 部署 runbook | ✅ 本文档 |
| 微信支付凭证 | ⏳ 需你补(APIv3密钥+证书) |
| 服务器部署 | ⏳ 需服务器访问 |
| 小程序审核发布 | ⏳ 需你在微信后台操作 |
