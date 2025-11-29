# Supabase 清理执行方案

> 基于 `SUPABASE_CLEANUP_GUIDE.md` 制定的具体执行方案
>
> 创建日期: 2025-11-29
> 更新日期: 2025-11-29

---

## 执行进度

| 阶段 | 状态 | 说明 |
|-----|------|------|
| 阶段1 | ✅ 完成 | 创建缺失的服务端版本 |
| 阶段2 | ✅ 完成 | 更新页面组件使用 API 路由 |
| 阶段3 | ✅ 完成 | 清理 API 路由中的 Supabase 依赖 |
| 阶段4 | ✅ 完成 | 简化 Repository 工厂和数据库客户端 |
| 阶段5 | 🔄 进行中 | 迁移剩余服务 |
| 阶段6 | ⏳ 待处理 | 删除 Supabase 相关文件 |
| 阶段7 | ⏳ 待处理 | 更新配置和依赖 |
| 阶段8 | ⏳ 待处理 | 更新文档 |

---

## 已完成的工作

### 已创建的 API 路由:
- `/api/budgets/status` - 预算状态
- `/api/budgets/summary` - 预算汇总
- `/api/budgets/suggestions` - 预算建议
- `/api/budgets/predict` - 月底支出预测
- `/api/recurring/generate` - 手动生成固定账单
- `/api/recurring/history` - 生成历史
- `/api/recurring/stats` - 今日统计
- `/api/categories` - 分类 CRUD
- `/api/categories/[id]` - 分类详情/更新/删除
- `/api/categories/subcategories` - 子分类
- `/api/categories/merchants` - 常用商家
- `/api/categories/sort-order` - 排序更新
- `/api/payment-methods` - 支付方式 CRUD
- `/api/payment-methods/[id]` - 支付方式详情/更新/删除

### 已更新的组件:
- `CategoryContext.tsx` - 使用 API 调用
- `categories/page.tsx` - 使用 API 调用
- `budget/page.tsx` - 使用 API 调用
- `recurring/page.tsx` - 使用 API 调用
- `recurring/history/page.tsx` - 使用 API 调用

### 已简化的文件:
- `lib/clients/db/index.ts` - 移除 Supabase 切换逻辑
- `lib/infrastructure/repositories/index.server.ts` - 直接使用 Prisma
- `lib/services/transaction/index.ts` - 使用服务端 Repository

---

## 待完成的工作

### 阶段5: 迁移剩余服务

以下服务文件仍然使用 Supabase，需要迁移或替换:

| 文件 | 被引用位置 | 建议方案 |
|-----|-----------|---------|
| `lib/services/weeklyReportService.ts` | weekly-reports 页面 | 创建 .server.ts + API |
| `lib/services/paymentMethodService.ts` | 组件 + 页面 | 更新组件使用 API (API 已创建) |
| `lib/services/recurringExpenses.ts` | API 路由 | 迁移到 .server.ts |
| `lib/services/cronService.ts` | cron 页面 + API | 已有 .server.ts |
| `lib/services/aiPrediction.ts` | 组件 + API | 迁移到 .server.ts |
| `lib/services/categoryService.ts` | 无引用 | 可删除 |

### 阶段6-8
按原计划执行删除、配置更新和文档更新。

---

## 执行概览

```
阶段1 -> 阶段2 -> 阶段3 -> 阶段4 -> 阶段5 -> 阶段6 -> 阶段7 -> 阶段8
 |        |        |        |        |        |        |        |
创建     更新     清理     简化     处理     删除     更新     更新
服务端   页面     API      工厂     日志     文件     配置     文档
版本     组件     路由
```

---

## 阶段 1: 创建缺失的服务端版本

### 1.1 创建 `budgetService.server.ts`

**当前问题**: `lib/services/budgetService.ts` 使用 Supabase RPC 和直接查询

**被引用位置**:
- `app/records/page.tsx` - 使用 `getMonthlyBudgetStatus`, `getCurrentYearMonth`
- `app/settings/expenses/budget/page.tsx` - 使用多个预算函数

**迁移内容**:
| 函数 | Supabase 调用 | Prisma 替代方案 |
|-----|--------------|----------------|
| `setBudget()` | `supabase.rpc('set_budget')` | Prisma upsert |
| `getMonthlyBudgetStatus()` | `supabase.rpc('get_monthly_budget_status')` | Prisma 聚合查询 |
| `getMonthlyActualExpense()` | `supabase.from('transactions')` | Prisma 聚合 |
| `getTotalBudgetSummary()` | `supabase.from('budgets')` | Prisma 查询 |
| `deleteBudget()` | `supabase.rpc('delete_budget')` | Prisma delete |
| `getBudgetHistory()` | `supabase.rpc('get_budget_history')` | Prisma 查询 |
| `getBudgetSuggestions()` | `supabase.from('budget_suggestions')` | Prisma 查询 |
| `refreshBudgetSuggestions()` | `supabase.rpc('refresh_all_budget_suggestions')` | Prisma 批量操作 |
| `predictMonthEndSpending()` | `supabase.rpc('predict_month_end_spending')` | Prisma + JS 计算 |

**工作量**: 高 (需要重写多个复杂查询)

### 1.2 创建 `recurringService.server.ts`

**当前问题**: `lib/services/recurringService.ts` 使用 Supabase

**被引用位置**:
- `app/settings/expenses/recurring/page.tsx` - 使用 `manualGenerateRecurring`
- `app/settings/expenses/recurring/history/page.tsx` - 使用 `getGenerationHistory`

**迁移内容**:
| 函数 | Supabase 调用 | Prisma 替代方案 |
|-----|--------------|----------------|
| `manualGenerateRecurring()` | `supabase.rpc('generate_recurring_transactions')` | Prisma 事务 + JS 逻辑 |
| `getGenerationHistory()` | `supabase.from('recurring_generation_logs')` | Prisma 查询 |
| `getTodayGenerationStats()` | `supabase.from('recurring_generation_logs')` | Prisma 聚合 |

**工作量**: 中

---

## 阶段 2: 更新页面组件使用 API 路由

### 2.1 创建预算相关 API 路由

创建 `/api/budgets/` 系列路由:

```
app/api/budgets/
├── route.ts              # GET (列表), POST (设置预算)
├── [id]/
│   └── route.ts          # DELETE (删除预算)
├── status/
│   └── route.ts          # GET (获取月度预算状态)
├── summary/
│   └── route.ts          # GET (获取总预算汇总)
├── history/
│   └── route.ts          # GET (获取预算历史)
├── suggestions/
│   └── route.ts          # GET (获取建议), POST (刷新建议)
└── predict/
    └── route.ts          # POST (预测月底支出)
```

### 2.2 创建固定账单生成 API 路由

创建 `/api/recurring/` 系列路由:

```
app/api/recurring/
├── generate/
│   └── route.ts          # POST (手动生成)
├── history/
│   └── route.ts          # GET (生成历史)
└── stats/
    └── route.ts          # GET (今日统计)
```

### 2.3 更新页面组件

| 页面 | 修改内容 |
|-----|---------|
| `app/records/page.tsx` | 改用 `/api/budgets/status` |
| `app/settings/expenses/budget/page.tsx` | 改用 `/api/budgets/*` 系列 API |
| `app/settings/expenses/recurring/page.tsx` | 改用 `/api/recurring/generate` |
| `app/settings/expenses/recurring/history/page.tsx` | 改用 `/api/recurring/history` |
| `app/settings/advanced/cron/page.tsx` | 已使用 API，确认使用 `.server.ts` |

---

## 阶段 3: 清理 API 路由中的 Supabase 依赖

### 3.1 `app/api/common-notes/route.ts`

**当前**: 导入 `supabaseServerClient`

**修改**: 检查是否所有功能都已使用 `getCommonNoteRepository()`，如是则删除导入

### 3.2 `app/api/smart-suggestions/route.ts`

**当前**: 使用 `supabaseServerClient` 进行复杂查询

**修改**:
- `generateContextSuggestions()` - 改用 Prisma 查询
- `generatePatternSuggestions()` - 改用 Prisma 查询

### 3.3 `app/api/smart-suggestions/learning/route.ts`

**当前**: 使用 `supabaseServerClient`

**修改**: 改用 Repository 或 Prisma

---

## 阶段 4: 简化 Repository 工厂和数据库客户端

### 4.1 简化 `lib/infrastructure/repositories/index.server.ts`

移除所有 Supabase 分支，直接使用 Prisma:

```typescript
// 修改前
if (USE_PRISMA) {
  // Prisma 逻辑
} else {
  // Supabase 逻辑
}

// 修改后
const { prisma } = require('@/lib/clients/db/prisma');
const { PrismaXxxRepository } = require('./prisma/PrismaXxxRepository');
return new PrismaXxxRepository(prisma);
```

### 4.2 删除或简化 `lib/infrastructure/repositories/index.ts`

这是客户端 Repository 入口，检查是否仍被使用:
- 如果不再需要客户端直接访问数据库 -> 删除
- 如果仍需要 -> 改用 API 调用

### 4.3 简化 `lib/clients/db/index.ts`

```typescript
// 简化后
export { prisma, disconnectPrisma, checkConnection } from './prisma';
```

---

## 阶段 5: 处理日志系统的 Supabase 依赖

### 方案 A: 创建 `PrismaTransport.ts` (推荐)

```typescript
// lib/services/logging/PrismaTransport.ts
import { prisma } from '@/lib/clients/db/prisma';
import type { LogRecord, LogTransport } from './types';

export class PrismaTransport implements LogTransport {
  async write(record: LogRecord): Promise<void> {
    await prisma.system_logs.create({ data: record });
  }
  // ...
}
```

### 方案 B: 使用 Repository

```typescript
import { getSystemLogRepository } from '@/lib/infrastructure/repositories/index.server';

export class RepositoryTransport implements LogTransport {
  async write(record: LogRecord): Promise<void> {
    const repo = getSystemLogRepository();
    await repo.create(record);
  }
}
```

### 更新 `lib/services/logging/index.ts`

```typescript
// 修改前
import { getSupabaseTransport } from './SupabaseTransport';

// 修改后
import { getPrismaTransport } from './PrismaTransport';
```

---

## 阶段 6: 删除 Supabase 相关文件

### 6.1 删除目录

```bash
rm -rf lib/clients/supabase/
rm -rf supabase/
```

### 6.2 删除 Repository 文件

```bash
rm lib/infrastructure/repositories/SupabaseTransactionRepository.ts
rm lib/infrastructure/repositories/SupabaseBudgetRepository.ts
rm lib/infrastructure/repositories/SupabaseCommonNoteRepository.ts
rm lib/infrastructure/repositories/SupabaseCategoryRepository.ts
rm lib/infrastructure/repositories/SupabasePaymentMethodRepository.ts
rm lib/infrastructure/repositories/SupabaseRecurringExpenseRepository.ts
rm lib/infrastructure/repositories/SupabaseWeeklyReportRepository.ts
rm lib/infrastructure/repositories/SupabaseAIFeedbackRepository.ts
rm lib/infrastructure/repositories/SupabaseSystemLogRepository.ts
```

### 6.3 删除旧版服务文件

```bash
rm lib/services/budgetService.ts           # 被 .server.ts 替代
rm lib/services/recurringService.ts        # 被 .server.ts 替代
rm lib/services/paymentMethodService.ts    # 已有 .server.ts
rm lib/services/recurringExpenses.ts       # 已有 .server.ts
rm lib/services/weeklyReportService.ts     # 已有 .server.ts
rm lib/services/cronService.ts             # 已有 .server.ts
rm lib/services/ai/AIFeedbackService.ts    # 已有 .server.ts
```

### 6.4 删除日志传输器

```bash
rm lib/services/logging/SupabaseTransport.ts
```

### 6.5 删除迁移脚本

```bash
rm scripts/migrate-payment-method.ts
```

---

## 阶段 7: 更新配置和依赖

### 7.1 更新 `package.json`

```bash
npm uninstall @supabase/supabase-js
```

更新描述:
```json
{
  "description": "Smart Ledger - Next.js + PostgreSQL (Prisma) + DeepSeek"
}
```

### 7.2 更新 `.env.local.example`

删除:
```env
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
USE_PRISMA=true
```

保留:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/smart_ledger
```

### 7.3 更新 `types/database.ts`

移除对 `@/types/supabase` 的依赖，使用 Prisma 生成的类型或手动定义

---

## 阶段 8: 更新文档

### 8.1 更新 `CLAUDE.md`

- 项目概述: 移除 Supabase 描述
- 技术栈: 更新为 PostgreSQL (Prisma)
- 目录结构: 移除 supabase 目录
- 环境配置: 更新环境变量

### 8.2 更新 `README.md`

更新项目介绍和配置说明

### 8.3 归档迁移文档

- `MIGRATION_CHECKLIST.md` -> 标记为已完成并归档
- `SUPABASE_CLEANUP_GUIDE.md` -> 清理完成后可删除

---

## 执行顺序和依赖关系

```
阶段1 ──┬── 阶段2 ──┬── 阶段3 ───── 阶段4 ───── 阶段5 ───── 阶段6 ───── 阶段7 ───── 阶段8
        │          │
        │          └── (API 路由创建后，页面才能更新)
        │
        └── (服务端版本创建后，才能创建 API)
```

**关键路径**:
1. 阶段1 必须先完成 (创建服务端版本)
2. 阶段2 依赖阶段1 (API 路由使用服务端版本)
3. 阶段3-5 可以并行进行
4. 阶段6 必须在阶段1-5全部完成后执行
5. 阶段7-8 最后执行

---

## 工作量估算

| 阶段 | 预计文件数 | 复杂度 | 说明 |
|-----|-----------|--------|------|
| 阶段1 | 2 | 高 | 需要重写多个复杂的 RPC 函数 |
| 阶段2 | 10+ | 中 | 创建 API 路由 + 更新页面 |
| 阶段3 | 3 | 中 | 改写复杂查询 |
| 阶段4 | 3 | 低 | 简化现有代码 |
| 阶段5 | 2 | 低 | 创建 Prisma 日志传输器 |
| 阶段6 | 20+ | 低 | 直接删除 |
| 阶段7 | 3 | 低 | 更新配置 |
| 阶段8 | 3 | 低 | 更新文档 |

---

## 验证清单

每个阶段完成后执行:

- [ ] `npm run build` - 无编译错误
- [ ] `npm run lint` - 无 lint 错误
- [ ] `npm run dev` - 应用正常启动
- [ ] 手动测试相关功能

最终验证:

- [ ] 搜索代码库确认无 `supabase` 关键字 (除文档外)
- [ ] 确认 `package.json` 无 Supabase 依赖
- [ ] 确认 `.env.local` 无 Supabase 环境变量
- [ ] 测试所有核心功能

---

## 开始执行

准备好后，请确认是否开始执行阶段1？

我将按照以下顺序创建:
1. `lib/services/budgetService.server.ts`
2. `lib/services/recurringService.server.ts`

---

*方案制定: Claude Code*
*日期: 2025-11-29*
