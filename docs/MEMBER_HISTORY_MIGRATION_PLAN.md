# 历史会员数据迁移方案

> 版本：v1.0 | 2026-06-20  
> 维护：团队联合（架构师执行 / 产品验收）  
> 关联：`docs/REBUILD_MASTER_PLAN.md` §四、`CMB/shunwei-api/migrations/`

---

## 一、现状结论（直接回答）

| 问题 | 答案 |
|------|------|
| **1770 老用户要不要重新导入？** | **不需要**。沿用生产库 `eb_user` + `eb_wechat_user`，微信 openid 不变 → 老用户无感登录 |
| **历史会员信息进新系统了吗？** | **部分**。CRMEB 侧 `eb_user.is_money_level` / `overdue_time` / `integral` **本来就在库里**；新建的 `sw_user_membership`、`sw_integral_batch` **尚未回填** |
| **新小程序能否看到老会员？** | 能读 CRMEB 字段（只读）；FIFO 批次、顺为档位记录需跑 **回填脚本** 后才完整 |

---

## 二、迁移原则

```
┌─────────────────────────────────────────────────────────┐
│  生产库 so1988_shunwei（154+ 表，1770 用户）              │
│                                                         │
│  eb_user / eb_wechat_user  ──→ 不动、不重导（零成本）     │
│  eb_member_ship            ──→ 005 脚本已 seed SW199/299│
│  eb_user.integral          ──→ 保留 + 回填 sw_integral_batch │
│  eb_other_order            ──→ 参考推断历史会员档位       │
│                                                         │
│  sw_* 新表                 ──→ 仅增量 DDL + 一次性回填   │
└─────────────────────────────────────────────────────────┘
```

1. **上线前全库 mysqldump 备份**
2. **先跑 MVP1~3 建表**，再跑回填（顺序不可颠倒）
3. **幂等设计**：回填脚本可重复执行，已存在记录跳过
4. **双写一致**：回填后 `SUM(sw_integral_batch.remain)` 应等于 `eb_user.integral`

---

## 三、迁移范围明细

### 3.1 零迁移（已就绪）

| 数据 | 表 | 数量（生产快照 2026-06-19） |
|------|-----|---------------------------|
| 用户账号 | `eb_user` | 1770 |
| 微信绑定 | `eb_wechat_user` | 1768 |
| 积分流水 | `eb_user_bill` | 600+ |
| 积分余额 | `eb_user.integral` | 字段级，随用户走 |
| 会员到期 | `eb_user.overdue_time` | 字段级 |
| 付费标识 | `eb_user.is_money_level` | 0/1/2 |

### 3.2 需回填（本次方案核心）

| 目标表 | 来源 | 说明 |
|--------|------|------|
| `sw_integral_batch` | `eb_user.integral > 0` | 每用户建一条 `batch_type=adjust, source_type=legacy_import` 的「历史积分」批次 |
| `sw_user_membership` | `eb_user` + `eb_other_order` | 当前有效会员写入 SW199/SW299 记录 |
| `sw_membership_ship_map` | `005_eb_member_ship_seed.sql` | 档位与 `eb_member_ship.id` 映射（通常已 seed） |

### 3.3 可选清洗

| 项 | 动作 |
|----|------|
| CRMEB 演示会员卡 | `005` 已 `is_del=1` 隐藏 month/quarter/year 等 |
| 分销员 → 店员 | MVP2：`is_staff=1` 映射员工角色（单独脚本） |
| 现金券历史 | MVP3 新能力，**无历史数据**，不从零伪造 |

---

## 四、档位推断规则

历史 CRMEB 会员订单在 `eb_other_order`（`type=1` 会员购买）：

| 条件 | 映射 tier_code |
|------|----------------|
| `pay_price >= 299` 或 `member_type` 对应 299 卡 | `SW299` |
| `pay_price >= 199` 或 `member_type` 对应 199 卡 | `SW199` |
| 仅有 `is_money_level=1` 且无订单 | **不写入** `sw_user_membership`（默认无会员，由管理员后期统一发放） |
| `overdue_time < NOW()` | `status=0`（已过期，仍写记录备查） |

> ✅ **已确认（2026-06-20）**：老会员无明确 199/299 订单 → 默认无会员，由超管后期统一发放。回填与公网部署在同一维护窗口执行。

---

## 五、执行步骤

### Step 0 — 备份

```bash
mysqldump -u so1988_shunwei -p so1988_shunwei > backup_$(date +%Y%m%d_%H%M).sql
```

### Step 1 — 建表（若生产未执行）

```bash
cd CMB/shunwei-api/migrations
# 按 README.md 顺序执行 mvp1/001~005, mvp2, mvp3
```

### Step 2 — 回填历史数据（与公网部署同一维护窗口）

> 顺序：备份 → 建表 → **本脚本** → 部署 shunwei-api → 真机验收

```bash
mysql -u so1988_shunwei -p so1988_shunwei < backfill/001_legacy_member_backfill.sql
```

### Step 3 — 冒烟验证

```sql
-- 1) 积分批次 vs CRMEB 总积分
SELECT u.uid, u.integral AS crmeb_integral,
       COALESCE(SUM(b.remain_amount),0) AS batch_remain
FROM eb_user u
LEFT JOIN sw_integral_batch b ON b.uid=u.uid AND b.status=1
WHERE u.integral > 0 AND COALESCE(u.is_del,0)=0
GROUP BY u.uid, u.integral
HAVING crmeb_integral != batch_remain
LIMIT 20;

-- 2) 有效会员数
SELECT COUNT(*) FROM eb_user
WHERE is_money_level IN (1,2) AND overdue_time > UNIX_TIMESTAMP() AND COALESCE(is_del,0)=0;

SELECT COUNT(*) FROM sw_user_membership WHERE status=1 AND expire_at > UNIX_TIMESTAMP();

-- 3) 抽样用户
SELECT * FROM sw_user_membership WHERE uid IN (3,4,5) ORDER BY uid, created_at DESC;
```

### Step 4 — 小程序验收

1. 老用户微信登录 → UID 不变  
2. 「我的」页会员到期时间与 CRMEB 后台一致  
3. 积分页显示「历史积分」批次  
4. 积分商城兑换 → FIFO 从批次扣减  

---

## 六、回滚

| 范围 | 命令 |
|------|------|
| 仅回填数据 | `DELETE FROM sw_integral_batch WHERE source_type='legacy_import';` |
| | `DELETE FROM sw_user_membership WHERE source_channel='legacy_import';` |
| 整库 | 恢复 Step 0 备份 |

**不影响** CRMEB 核心表数据。

---

## 七、风险与待确认

| # | 风险 | 缓解 |
|---|------|------|
| 1 | 老会员无明确 199/299 订单 | ✅ 已确认：默认无会员，超管后期统一发放 |
| 2 | 积分回填后 FIFO 与旧消耗逻辑差异 | 回填批次标记 `legacy_import`，新发放走新 source_type |
| 3 | 生产库未连本地 shunwei-api | 回填在**生产 MySQL**执行，与 API 部署独立 |
| 4 | 重复执行回填 | SQL 幂等：`NOT EXISTS` 守卫 |

---

## 八、分工建议

| 角色 | 任务 |
|------|------|
| **你** | 确认默认档位规则；批准维护窗口 |
| **架构师** | 生产执行 SQL + 验证查询 + 异常清单 |
| **产品** | 抽样 10 个老用户真机验收 |
| **设计师** | 积分页/会员页展示「历史积分」批次文案（可选） |

---

## 九、相关文件

- 回填 SQL：`CMB/shunwei-api/migrations/backfill/001_legacy_member_backfill.sql`
- 建表：`CMB/shunwei-api/migrations/mvp1/`
- 部署清单：`docs/DEPLOY_AND_PAYMENT_PLAN.md`
