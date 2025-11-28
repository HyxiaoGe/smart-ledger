# Supabase → Prisma 迁移清单

> 本文档记录从 Supabase 迁移到本地 PostgreSQL (Prisma) 的进度和计划。
>
> 最后更新: 2025-11-28

## 迁移状态概览

| 状态 | 说明 |
|-----|------|
| ✅ | 已完成 |
| 🚧 | 进行中 |
| ⏳ | 待开始 |
| ⚠️ | 需要特殊处理 |
| ❌ | 无法迁移/保留 Supabase |

---

## 一、已完成迁移 ✅

### Repository 层

| 模块 | Repository 接口 | Supabase 实现 | Prisma 实现 | 状态 |
|------|----------------|--------------|------------|------|
| Transaction | `ITransactionRepository` | `SupabaseTransactionRepository` | `PrismaTransactionRepository` | ✅ |
| Budget | `IBudgetRepository` | `SupabaseBudgetRepository` | `PrismaBudgetRepository` | ✅ |
| CommonNote | `ICommonNoteRepository` | `SupabaseCommonNoteRepository` | `PrismaCommonNoteRepository` | ✅ |
| Category | `ICategoryRepository` | `SupabaseCategoryRepository` | `PrismaCategoryRepository` | ✅ |
| PaymentMethod | `IPaymentMethodRepository` | `SupabasePaymentMethodRepository` | `PrismaPaymentMethodRepository` | ✅ |
| RecurringExpense | `IRecurringExpenseRepository` | `SupabaseRecurringExpenseRepository` | `PrismaRecurringExpenseRepository` | ✅ |
| WeeklyReport | `IWeeklyReportRepository` | `SupabaseWeeklyReportRepository` | `PrismaWeeklyReportRepository` | ✅ |
| AIFeedback | `IAIFeedbackRepository` | `SupabaseAIFeedbackRepository` | `PrismaAIFeedbackRepository` | ✅ |
| SystemLog | `ISystemLogRepository` | `SupabaseSystemLogRepository` | `PrismaSystemLogRepository` | ✅ |

### 基础设施

| 项目 | 文件 | 状态 |
|-----|------|------|
| Prisma Schema | `prisma/schema.prisma` | ✅ |
| Prisma Client | `lib/clients/db/prisma.ts` | ✅ |
| Repository 工厂 | `lib/infrastructure/repositories/index.server.ts` | ✅ |
| 环境变量切换 | `USE_PRISMA=true` | ✅ |

### 服务层 (服务端版本)

| 服务 | 服务端文件 | 状态 |
|-----|-----------|------|
| PaymentMethod | `lib/services/paymentMethodService.server.ts` | ✅ |
| RecurringExpense | `lib/services/recurringExpenses.server.ts` | ✅ |
| WeeklyReport | `lib/services/weeklyReportService.server.ts` | ✅ |
| AIFeedback | `lib/services/ai/AIFeedbackService.server.ts` | ✅ |

---

## 二、待迁移服务

### P0 - 核心业务

| # | 服务文件 | 涉及表 | 复杂度 | 状态 | 备注 |
|---|---------|-------|--------|------|------|
| 1 | `lib/services/paymentMethodService.ts` | `payment_methods` | 中 | ✅ | 已创建 `.server.ts` 版本 |
| 2 | `lib/services/recurringExpenses.ts` | `recurring_expenses`, `transactions` | 中 | ✅ | 已创建 `.server.ts` 版本 |
| 3 | `lib/services/weeklyReportService.ts` | `weekly_reports` | 低 | ✅ | 已创建 `.server.ts` 版本 |

### P1 - AI/分析功能

| # | 服务文件 | 涉及表 | 复杂度 | 状态 | 备注 |
|---|---------|-------|--------|------|------|
| 4 | `lib/services/ai/AIFeedbackService.ts` | `ai_feedbacks`, `ai_requests`, `ai_feedback_templates`, `ai_performance_stats` | 高 | ✅ | 已创建 `.server.ts` 版本 |
| 5 | `lib/services/aiPrediction.ts` | `transactions` | 低 | ⏳ | 检查是否有遗漏 |

### P2 - 管理/运维功能

| # | 服务文件 | 涉及表 | 复杂度 | 状态 | 备注 |
|---|---------|-------|--------|------|------|
| 6 | `lib/services/cronService.ts` | `cron.job`, `cron.job_run_details` | 特殊 | ⚠️ | pg_cron 扩展，保留 Supabase |
| 7 | `lib/services/logging/index.ts` | `system_logs` | 低 | ⏳ | 日志写入 |

---

## 三、待迁移 API 路由

| # | API 路由 | 直接使用 Supabase | 状态 | 优先级 |
|---|---------|------------------|------|--------|
| 1 | `app/api/common-notes/route.ts` | 是 | ⏳ | P1 |
| 2 | `app/api/smart-suggestions/route.ts` | 是 | ⏳ | P1 |
| 3 | `app/api/smart-suggestions/learning/route.ts` | 是 | ⏳ | P1 |
| 4 | `app/api/admin/logs/route.ts` | 是 | ⏳ | P2 |
| 5 | `app/api/admin/logs/stats/route.ts` | 是 | ⏳ | P2 |

---

## 四、待迁移组件

### P0 - 核心组件

| # | 组件文件 | 用途 | 状态 |
|---|---------|------|------|
| 1 | `app/add/page.tsx` | 添加账单页 | ⏳ |
| 2 | `app/components/TransactionList.tsx` | 交易列表 | ⏳ |
| 3 | `components/features/transactions/QuickTransaction/QuickTransaction.tsx` | 快速记账 | ⏳ |
| 4 | `components/features/transactions/QuickTransaction/QuickTransactionCard.tsx` | 快速记账卡片 | ⏳ |
| 5 | `components/features/transactions/TransactionList/GroupedList.tsx` | 交易列表分组 | ⏳ |

### P1 - 统计/分析组件

| # | 组件文件 | 用途 | 状态 |
|---|---------|------|------|
| 6 | `components/features/statistics/ComparisonPanel.tsx` | 对比面板 | ⏳ |
| 7 | `components/features/statistics/GoalTrackingPanel.tsx` | 目标追踪 | ⏳ |
| 8 | `components/features/ai-analysis/ConsumptionHabitsPanel.tsx` | 消费习惯 | ⏳ |
| 9 | `components/features/ai-analysis/ConsumptionPredictionPanel.tsx` | 消费预测 | ⏳ |

---

## 五、新建的 Repository (已完成)

| Repository 接口 | Prisma 实现 | Supabase 实现 | 对应表 | 状态 |
|----------------|------------|---------------|--------|------|
| `IPaymentMethodRepository` | `PrismaPaymentMethodRepository` | `SupabasePaymentMethodRepository` | `payment_methods` | ✅ |
| `IRecurringExpenseRepository` | `PrismaRecurringExpenseRepository` | `SupabaseRecurringExpenseRepository` | `recurring_expenses` | ✅ |
| `IWeeklyReportRepository` | `PrismaWeeklyReportRepository` | `SupabaseWeeklyReportRepository` | `weekly_reports` | ✅ |
| `IAIFeedbackRepository` | `PrismaAIFeedbackRepository` | `SupabaseAIFeedbackRepository` | `ai_feedbacks`, `ai_requests` | ✅ |
| `ISystemLogRepository` | `PrismaSystemLogRepository` | `SupabaseSystemLogRepository` | `system_logs` | ✅ |

---

## 六、RPC 函数迁移方案

### 已改写为 Prisma 查询

| RPC 函数名 | 所在服务 | 迁移方案 | 状态 |
|-----------|---------|---------|------|
| `get_payment_methods_with_stats` | paymentMethodService | Prisma 聚合查询 | ✅ |
| `add_payment_method` | paymentMethodService | Prisma create | ✅ |
| `update_payment_method` | paymentMethodService | Prisma update | ✅ |
| `delete_payment_method` | paymentMethodService | Prisma delete + 迁移逻辑 | ✅ |
| `set_default_payment_method` | paymentMethodService | Prisma 事务 | ✅ |
| `get_payment_method_usage_detail` | paymentMethodService | Prisma 聚合 | ✅ |
| `generate_weekly_report` | weeklyReportService | Prisma 事务 + JS 逻辑 | ✅ |

### 保留 Supabase (pg_cron 特有)

| RPC 函数名 | 所在服务 | 原因 |
|-----------|---------|------|
| `get_cron_jobs` | cronService | pg_cron 扩展 |
| `get_cron_job_history` | cronService | pg_cron 扩展 |
| `get_cron_job_stats` | cronService | pg_cron 扩展 |

---

## 七、迁移计划

### 阶段 1: Repository 层 ✅ (已完成)

```
1.1 PaymentMethod ✅
1.2 RecurringExpense ✅
1.3 WeeklyReport ✅
1.4 AIFeedback ✅
1.5 SystemLog ✅
```

### 阶段 2: 服务端服务 ✅ (已完成)

```
2.1 paymentMethodService.server.ts ✅
2.2 recurringExpenses.server.ts ✅
2.3 weeklyReportService.server.ts ✅
2.4 AIFeedbackService.server.ts ✅
```

### 阶段 3: API 路由迁移 ⏳

```
3.1 更新 API 路由导入服务端版本
3.2 common-notes API
3.3 smart-suggestions API
3.4 admin/logs API
```

### 阶段 4: 组件改造 ⏳

```
4.1 改造组件使用 Service 层而非直接调用 Supabase
    ├── QuickTransaction 组件
    ├── TransactionList 组件
    └── AddPage 页面
```

### 阶段 5: 管理功能

```
5.1 保留 CronService (依赖 pg_cron)
5.2 考虑使用 Node.js 定时任务替代
```

---

## 八、使用说明

### 切换到 Prisma

在 `.env.local` 中设置:

```env
USE_PRISMA=true
DATABASE_URL=postgresql://user:password@localhost:5432/smart_ledger
```

### 切换回 Supabase

```env
# 不设置 USE_PRISMA 或设置为 false
USE_PRISMA=false

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 服务端版本使用

API 路由和 Server Components 应使用 `.server.ts` 版本:

```typescript
// 在 API 路由中
import {
  getPaymentMethodsWithStats,
  addPaymentMethod,
} from '@/lib/services/paymentMethodService.server';

// 或使用 Repository
import { getPaymentMethodRepository } from '@/lib/infrastructure/repositories/index.server';
```

---

## 九、迁移注意事项

### 1. 数据类型转换

- Prisma `Decimal` 类型需要转换为 `number` 供前端使用
- 日期查询使用 `Date` 对象而非字符串

### 2. 事务处理

Prisma 事务写法:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.table1.create({ ... });
  await tx.table2.update({ ... });
});
```

### 3. 聚合查询

Prisma 聚合替代 RPC:
```typescript
const stats = await prisma.transactions.aggregate({
  where: { payment_method: id },
  _sum: { amount: true },
  _count: true,
});
```

### 4. 软删除

保持与 Supabase 一致的软删除逻辑:
```typescript
// 查询时排除已删除
where: { deleted_at: null }

// 删除时更新 deleted_at
update: { deleted_at: new Date() }
```

---

## 十、已知问题

| 问题 | 描述 | 解决方案 |
|-----|------|---------|
| pg_cron | 本地 PostgreSQL 默认不支持 pg_cron | 保留 cronService 使用 Supabase，或改用 Node.js 定时任务 |
| RPC 函数 | 部分复杂逻辑在数据库函数中 | 已迁移到 Service 层用 Prisma + JS 实现 |

---

## 十一、新增文件清单

### Repository 接口 (`lib/domain/repositories/`)

- `IPaymentMethodRepository.ts`
- `IRecurringExpenseRepository.ts`
- `IWeeklyReportRepository.ts`
- `IAIFeedbackRepository.ts`
- `ISystemLogRepository.ts`

### Prisma 实现 (`lib/infrastructure/repositories/prisma/`)

- `PrismaPaymentMethodRepository.ts`
- `PrismaRecurringExpenseRepository.ts`
- `PrismaWeeklyReportRepository.ts`
- `PrismaAIFeedbackRepository.ts`
- `PrismaSystemLogRepository.ts`

### Supabase 实现 (`lib/infrastructure/repositories/`)

- `SupabasePaymentMethodRepository.ts`
- `SupabaseRecurringExpenseRepository.ts`
- `SupabaseWeeklyReportRepository.ts`
- `SupabaseAIFeedbackRepository.ts`
- `SupabaseSystemLogRepository.ts`

### 服务端服务 (`lib/services/`)

- `paymentMethodService.server.ts`
- `recurringExpenses.server.ts`
- `weeklyReportService.server.ts`
- `ai/AIFeedbackService.server.ts`

---

## 十二、参考文档

- [Prisma 官方文档](https://www.prisma.io/docs)
- [项目 Repository 模式说明](./lib/infrastructure/repositories/README.md)
- [环境变量配置](./.env.example)

---

## 更新日志

| 日期 | 更新内容 |
|-----|---------|
| 2025-11-28 | 创建迁移清单文档 |
| 2025-11-28 | 完成所有 Repository 接口和实现 (Prisma + Supabase) |
| 2025-11-28 | 完成服务端版本服务文件 |
| 2025-11-28 | 更新 ServerRepositoryFactory |
