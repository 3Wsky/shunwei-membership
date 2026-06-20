# CRMEB 生产后端升级 Runbook：v5.6.4 → v6.0.1（方案C）

> 目标：把生产后端 `ok.xjshunwei.cn` 从 **CRMEB-BZ v5.6.4** 升级到 **v6.0.1**，
> 使其支持新版小程序所用的 `theme_info` 等接口，解决重编译小程序与旧后端的接口不匹配问题。

---

## 0. 背景与版本事实（已实测确认）

| 对象 | 版本 | 装修/主题接口 |
|------|------|--------------|
| 生产 `ok.xjshunwei.cn` | CRMEB-BZ **v5.6.4**（version_code 564）| `v2/diy/get_diy`、`v2/diy/get_version` |
| 仓库 `CMB-backend/crmeb` | CRMEB-BZ **v6.0.1** | `theme_info/{type}`、`theme/{product,coupon,...}` |
| 重编译小程序 | 基于 v6 模板 | `theme_info`（生产 v5.6.4 返回 404）|

**会员/积分功能**走独立的 `shunwei-api`（旁路），与本次 CRMEB 升级**互不影响**；其新增表 `sw_*` 通过 `uid` 关联 `eb_user`，升级后需回归验证关联仍有效。

---

## ⚠️ 高危提示（务必遵守）

1. 这是**生产环境跨大版本（v5 → v6）升级**，含数据库结构迁移 + 代码替换，**可能不可逆**。
2. **任何操作前必须全量备份**（数据库 + 代码目录）。
3. **绝不在生产上直接试**——先在 staging 克隆环境验证通过，再升生产。
4. 选择**业务低峰期**执行，并准备**回滚预案**。
5. 仓库内仅含 `upgrade/versions/v6.0.1.php`（v6.0.0→v6.0.1 增量），**不含 v5.6.4→v6.0.0 的官方迁移**。完整跨版本升级需走 **CRMEB 官方升级中心 / 官方升级包**（后台 → 系统维护 → 系统升级，连官方更新服务器），不能仅靠本仓库脚本。

---

## 1. 前置准备

- [ ] 确认服务器访问方式（宝塔面板 / SSH）
- [ ] 确认 CRMEB 授权与官方升级中心可用（v5→v6 需官方升级包）
- [ ] 确认服务器环境满足 v6.0.1 要求：PHP 7.4+（带 redis、swoole/workerman 视需要）、MySQL 5.7+/8.0、Redis、Composer
- [ ] 通知相关人员维护窗口

## 2. 全量备份（步骤 0，不可跳过）

```bash
# 数据库备份（在服务器执行，替换实际库名/账号）
mysqldump -u so1988_shunwei -p --single-transaction --default-character-set=utf8mb4 \
  so1988_shunwei > /backup/so1988_shunwei_$(date +%F_%H%M%S).sql

# 代码目录备份
tar -czf /backup/crmeb_code_$(date +%F_%H%M%S).tar.gz /www/wwwroot/<crmeb站点目录>
```

- [ ] 验证备份文件大小正常、可解压/可导入

## 3. 搭建 staging 测试环境（步骤 1）

- [ ] 克隆一份生产代码到 staging 目录 / 子域名
- [ ] 新建 staging 库，导入生产备份 SQL
- [ ] 配置 staging 的 `crmeb/.env`（指向 staging 库、独立 Redis）
- [ ] staging 站点能正常访问后台

## 4. 在 staging 执行升级（步骤 2）

**首选：CRMEB 官方升级中心**
- [ ] 后台 → 系统设置/系统维护 → **系统升级**
- [ ] 按官方引导从 v5.6.4 **逐版本**升级到 v6.0.1（中间版本不可跳过）
- [ ] 每步记录升级日志，留意失败项

> 若使用本仓库代码替换方式：用 `CMB-backend/crmeb` 覆盖代码后，执行 `upgrade/VersionManager.php` 应用 `versions/*.php`。但仓库目前只有 `v6.0.1.php`，**缺中间迁移**，单独执行不足以完成 v5→v6，仍需官方迁移补齐。

## 5. staging 验证（步骤 3，回归清单）

CRMEB 核心：
- [ ] `GET /api/version` 返回 v6.0.1（code 601）
- [ ] `GET /api/theme_info/home`、`/api/theme_info/user` 返回 200（不再 404）
- [ ] 首页装修、分类、商品详情、个人中心正常加载
- [ ] 登录（小程序 JWT）、下单、支付链路正常

会员/积分（shunwei-api 旁路）：
- [ ] `eb_user` 表结构变化不影响 `shunwei-api` 读取（`uid`、`integral`、`birthday` 等字段仍在）
- [ ] `sw_*` 表（`sw_user_membership`、`sw_integral_batch`、`sw_integral_ledger`、`sw_system_config` 等）与 v6 表共存无冲突
- [ ] `GET /api/membership/plans`、`claim-gift`、`/api/integral/summary` 正常
- [ ] 小程序：会员中心 / 付费会员 / 积分页 / 积分商城 全部加载且数据正确

小程序产物：
- [ ] 把 `getThemeInfo` 兼容垫片**回退逻辑保留**（升级后优先命中 theme_info，回退路径作为双保险）
- [ ] 重新编译并验证无 `theme/*` 404

## 6. 升级生产（步骤 4）

- [ ] 低峰期，二次确认备份就绪
- [ ] 重复步骤 4 的官方升级流程于生产
- [ ] 执行步骤 5 回归清单于生产
- [ ] 异常 → 立即回滚（恢复代码 tar + 导回数据库备份）

## 7. 回滚预案

```bash
# 代码回滚
tar -xzf /backup/crmeb_code_<ts>.tar.gz -C /www/wwwroot/<crmeb站点目录>
# 数据库回滚（先建空库或 DROP 后重建，再导入）
mysql -u so1988_shunwei -p so1988_shunwei < /backup/so1988_shunwei_<ts>.sql
# 清缓存
php think clear   # 或删除 runtime 缓存
```

---

## 8. 分工与待办

| 事项 | 负责 |
|------|------|
| 服务器备份、staging 搭建、官方升级执行 | 用户 / 运维（需服务器权限）|
| 升级 runbook、接口契约核对、回归用例 | 产品/架构（本团队）|
| 升级后小程序回归、会员/积分联调 | 本团队（需 staging 可访问）|
| CRMEB 官方升级包/授权 | 用户（CRMEB 账号）|

> 本团队（Agent）**无生产服务器访问权**，第 2/3/4/6 步的服务器侧操作需用户或运维执行；Agent 可提供命令、核对接口、协助 staging 验证。
