# GitHub Actions 自动部署（后端 + 管理后台）

工作流位于**仓库根目录** `.github/workflows/deploy.yml`（⚠️ 必须在根目录，GitHub 才会识别；旧版误放在 `CMB/shunwei-api/.github/` 子目录，从未生效，已删除）。

## 触发条件

- 推送到 `main` 分支，且改动涉及 `CMB/shunwei-api/**`、`fzlsaas-admin/**` 或工作流本身。
- 也可在 GitHub 仓库 `Actions` 页面点 `Run workflow` 手动触发。

## 它做了什么（两个并行 job）

### job 1：`deploy-api`（后端 shunwei-api）
1. 安装依赖、JS 语法检查。
2. 打包 `CMB/shunwei-api`（排除 .git/.github/node_modules/data/.env/*.log）。
3. SCP 上传到服务器 → 解包到 `SERVER_API_PATH`（保留 `.env` 和 `data/`）。
4. `npm ci --omit=dev` → PM2 reload/start `shunwei-api` → `/health` 健康检查。

### job 2：`deploy-admin`（管理后台 fzlsaas-admin）
1. `npm ci` → `npm run build`（生产 base `/fzlsaas/`）。
2. 打包 `dist/` → SCP 上传 → 解包覆盖到 `SERVER_ADMIN_DIST_PATH`。

## 需要在 GitHub 配置的 Secrets

仓库 `Settings → Secrets and variables → Actions → New repository secret`：

| Secret | 必需 | 说明 | 示例 |
| --- | :--: | --- | --- |
| `SERVER_HOST` | ✅ | 服务器 IP 或域名 | `123.45.67.89` |
| `SERVER_PORT` | 可选 | SSH 端口（默认 22 可不填） | `22` |
| `SERVER_USER` | ✅ | SSH 登录用户 | `root` |
| `SERVER_SSH_KEY` | ✅ | SSH **私钥**全文（含 BEGIN/END 行） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `SERVER_API_PATH` | ✅* | 后端部署目录（须以 `shunwei-api` 结尾） | `/www/wwwroot/our/shunwei-api` |
| `SERVER_ADMIN_DIST_PATH` | 可选 | 后台 dist 目录（须以 `dist` 结尾）；**不填则自动推导**为 `<API父目录>/fzlsaas-admin/dist` | `/www/wwwroot/our/fzlsaas-admin/dist` |

> **兼容旧配置**：若你之前已配过旧 secret `SERVER_PATH`（指向后端目录），无需改名——工作流会优先用 `SERVER_API_PATH`，没有则回退 `SERVER_PATH`。
> *：`SERVER_API_PATH` 和旧 `SERVER_PATH` 至少要有一个。`SERVER_ADMIN_DIST_PATH` 不填时，会基于后端路径的父目录自动推导出 admin dist 路径（本项目布局即 `/www/wwwroot/our/` 下并列）。

> 服务器目录约定见 `nginx-ok-xjshunwei-same-site.conf.example`：
> - 后端 `/www/wwwroot/our/shunwei-api/`（PM2 :8787）
> - 后台 `/www/wwwroot/our/fzlsaas-admin/dist/`（Nginx `/fzlsaas/`）

## 服务器一次性准备

```bash
# Node 20/22 + PM2 + Nginx 已装
mkdir -p /www/wwwroot/our/shunwei-api
cd /www/wwwroot/our/shunwei-api
cp .env.example .env   # 填生产 CRMEB 库、ADMIN_PASSWORD、ADMIN_SESSION_SECRET 等
# admin dist 目录
mkdir -p /www/wwwroot/our/fzlsaas-admin/dist
```

> 自动部署**不会**覆盖服务器上的 `.env` 和 `data/`（生产密钥/抽奖数据安全）。

## 生成部署用 SSH key（在服务器执行）

```bash
ssh-keygen -t ed25519 -C "gh-actions-deploy" -f ~/.ssh/gh_deploy -N ""
cat ~/.ssh/gh_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/gh_deploy            # 复制【私钥】全文 → 填到 GitHub Secret SERVER_SSH_KEY
```

## 验证

```bash
curl https://ok.xjshunwei.cn/sw-api/health           # 后端 200
curl -I https://ok.xjshunwei.cn/fzlsaas/             # 后台首页 200
# 浏览器打开 https://ok.xjshunwei.cn/fzlsaas/ 看审批管理是否显示提交人/审批人姓名
```
