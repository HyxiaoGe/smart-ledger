# Supabase 依赖清理指南

> 本文档整理了项目中所有与 Supabase 相关的代码和文件，用于指导完全移除 Supabase 依赖。
>
> 生成日期: 2025-11-29

---

## 一、当前依赖概览

项目目前采用 **双数据库架构**（Supabase + Prisma），通过环境变量 `USE_PRISMA=true` 控制切换。清理工作需要：

1. 删除所有 Supabase 相关代码和文件
2. 修改依赖切换逻辑，直接使用 Prisma
3. 更新配置和文档

---

## 二、需要删除的文件

### 2.1 Supabase 客户端 (2 个文件)

| 文件路径 | 说明 |
|---------|------|
| `lib/clients/supabase/client.ts` | 浏览器端 Supabase 客户端 |
| `lib/clients/supabase/server.ts` | 服务端 Supabase 客户端 |

**清理操作**: 删除整个 `lib/clients/supabase/` 目录

### 2.2 Supabase Repository 实现 (9 个文件)

| 文件路径 | 对应 Prisma 实现 |
|---------|-----------------|
| `lib/infrastructure/repositories/SupabaseTransactionRepository.ts` | `prisma/PrismaTransactionRepository.ts` |
| `lib/infrastructure/repositories/SupabaseBudgetRepository.ts` | `prisma/PrismaBudgetRepository.ts` |
| `lib/infrastructure/repositories/SupabaseCommonNoteRepository.ts` | `prisma/PrismaCommonNoteRepository.ts` |
| `lib/infrastructure/repositories/SupabaseCategoryRepository.ts` | `prisma/PrismaCategoryRepository.ts` |
| `lib/infrastructure/repositories/SupabasePaymentMethodRepository.ts` | `prisma/PrismaPaymentMethodRepository.ts` |
| `lib/infrastructure/repositories/SupabaseRecurringExpenseRepository.ts` | `prisma/PrismaRecurringExpenseRepository.ts` |
| `lib/infrastructure/repositories/SupabaseWeeklyReportRepository.ts` | `prisma/PrismaWeeklyReportRepository.ts` |
| `lib/infrastructure/repositories/SupabaseAIFeedbackRepository.ts` | `prisma/PrismaAIFeedbackRepository.ts` |
| `lib/infrastructure/repositories/SupabaseSystemLogRepository.ts` | `prisma/PrismaSystemLogRepository.ts` |

### 2.3 旧版服务文件 (建议删除，已有 .server.ts 版本)

| 文件路径 | 替代文件 | 状态 |
|---------|---------|------|
| `lib/services/paymentMethodService.ts` | `paymentMethodService.server.ts` | 可删除 |
| `lib/services/recurringExpenses.ts` | `recurringExpenses.server.ts` | 可删除 |
| `lib/services/weeklyReportService.ts` | `weeklyReportService.server.ts` | 可删除 |
| `lib/services/ai/AIFeedbackService.ts` | `AIFeedbackService.server.ts` | 可删除 |
| `lib/services/cronService.ts` | `cronService.server.ts` | 可删除 |

### 2.4 日志传输器

| 文件路径 | 说明 |
|---------|------|
| `lib/services/logging/SupabaseTransport.ts` | 需要改为 Prisma 版本或删除 |

### 2.5 数据库 Schema

| 文件路径 | 说明 |
|---------|------|
| `supabase/schema.sql` | Supabase 数据库 Schema，迁移后可删除 |

### 2.6 迁移脚本

| 文件路径 | 说明 |
|---------|------|
| `scripts/migrate-payment-method.ts` | 使用 Supabase，迁移完成后可删除 |

---

## 三、需要修改的文件

### 3.1 Repository 工厂 (关键修改)

#### `lib/infrastructure/repositories/index.server.ts`

**当前逻辑**: 根据 `USE_PRISMA` 环境变量切换 Supabase/Prisma

**修改方案**: 直接使用 Prisma，删除 Supabase 相关分支

```typescript
// 修改前
static getTransactionRepository(): ITransactionRepository {
  if (!this.transactionRepository) {
    if (USE_PRISMA) {
      // Prisma 逻辑
    } else {
      // Supabase 逻辑 <- 删除这部分
    }
  }
  return this.transactionRepository;
}

// 修改后
static getTransactionRepository(): ITransactionRepository {
  if (!this.transactionRepository) {
    const { prisma } = require('@/lib/clients/db/prisma');
    const { PrismaTransactionRepository } = require('./prisma/PrismaTransactionRepository');
    this.transactionRepository = new PrismaTransactionRepository(prisma);
  }
  return this.transactionRepository;
}
```

#### `lib/infrastructure/repositories/index.ts`

**说明**: 客户端 Repository 入口，需要检查是否仍有客户端代码使用

**修改方案**: 如果不再需要客户端访问数据库，可删除此文件

### 3.2 数据库客户端入口

#### `lib/clients/db/index.ts`

**当前逻辑**: 提供 `getSupabaseClient()` 和 `getPrismaClient()` 切换

**修改方案**:
- 删除 `getSupabaseClient()` 函数
- 删除 `executeQuery()` 双重执行逻辑
- 简化为仅导出 Prisma 客户端

```typescript
// 修改后的简化版本
export { prisma } from './prisma';
export { disconnectPrisma, checkConnection } from './prisma';
```

### 3.3 API 路由 (仍使用 Supabase 的复杂查询)

#### `app/api/smart-suggestions/route.ts`

**问题**:
- 第 8 行: `import { supabaseServerClient } from '@/lib/clients/supabase/server';`
- `generateContextSuggestions()` 使用 Supabase 复杂查询
- `generatePatternSuggestions()` 使用 Supabase 复杂查询

**修改方案**: 将 Supabase 查询改写为 Prisma 查询或使用 Repository

```typescript
// 修改前
const supabase = supabaseServerClient;
let query = supabase.from('common_notes').select('*')...

// 修改后 (使用 Prisma)
const { prisma } = require('@/lib/clients/db/prisma');
const notes = await prisma.common_notes.findMany({
  where: {
    is_active: true,
    // ... 其他条件
  },
  orderBy: { usage_count: 'desc' },
  take: 10
});
```

#### `app/api/smart-suggestions/learning/route.ts`

**问题**: 第 8 行使用 `supabaseServerClient`

**修改方案**: 检查具体用途，改用 Repository 或 Prisma

#### `app/api/common-notes/route.ts`

**问题**: 第 9 行使用 `supabaseServerClient`

**修改方案**: 检查具体用途，改用 `getCommonNoteRepository()`

### 3.4 仍使用 Supabase 的服务文件

#### `lib/services/budgetService.ts`

**问题**: 大量使用 `supabase.rpc()` 和 `supabase.from()` 查询

**修改方案**:
1. 创建 `budgetService.server.ts` 版本
2. 将 RPC 调用改写为 Prisma 查询
3. 创建 `IBudgetRepository` 接口 (如果尚未创建)

**涉及的 RPC 函数**:
- `set_budget` -> Prisma upsert
- `get_monthly_budget_status` -> Prisma 聚合查询
- `delete_budget` -> Prisma delete
- `get_budget_history` -> Prisma 查询
- `refresh_all_budget_suggestions` -> Prisma 批量操作
- `predict_month_end_spending` -> Prisma 聚合 + JS 计算

#### `lib/services/recurringService.ts`

**问题**: 使用 `supabase.rpc()` 和 `supabase.from()` 查询

**修改方案**: 使用 `recurringExpenses.server.ts` 替代或创建新的服务端版本

**涉及的 RPC 函数**:
- `generate_recurring_transactions` -> Prisma 事务操作

#### `lib/services/aiPrediction.ts`

**问题**: 第 18 行导入 Supabase 客户端

**修改方案**: 检查具体用途，改用 Repository

### 3.5 类型定义

#### `types/database.ts`

**问题**: 第 6 行 `import { Database } from '@/types/supabase';`

**修改方案**:
- 检查是否存在 `types/supabase.ts` 文件
- 如果这是 Supabase 自动生成的类型，需要手动定义或使用 Prisma 生成的类型

---

## 四、需要更新的配置文件

### 4.1 package.json

**删除依赖**:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.47.10"  // 删除此行
  }
}
```

**更新描述**:
```json
{
  "description": "Smart Ledger MVP - Next.js + PostgreSQL + DeepSeek"
}
```

### 4.2 .env.local.example

**删除环境变量**:
```env
# 删除以下内容
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

**保留/更新**:
```env
# 数据库连接 (Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/smart_ledger

# 不再需要 USE_PRISMA 环境变量
```

### 4.3 .gitignore / .dockerignore

检查是否有 Supabase 相关的忽略规则需要清理

---

## 五、需要更新的文档

### 5.1 CLAUDE.md

**更新内容**:
- 项目概述: 移除 Supabase 描述
- 技术栈: `Supabase (PostgreSQL)` -> `PostgreSQL (Prisma)`
- 目录结构: 移除 `supabase/` 目录描述
- 环境配置: 更新必需的环境变量
- 数据库架构: 更新为 Prisma Schema

### 5.2 README.md

更新项目说明和配置指南

### 5.3 MIGRATION_CHECKLIST.md

迁移完成后可归档或删除

---

## 六、清理步骤清单

### 阶段 1: 补全遗漏的服务迁移

- [ ] 创建 `lib/services/budgetService.server.ts`
- [ ] 创建 `lib/services/recurringService.server.ts` (如果需要)
- [ ] 更新 `lib/services/aiPrediction.ts` 使用 Repository
- [ ] 创建 `lib/services/logging/PrismaTransport.ts` (如果需要日志写入数据库)

### 阶段 2: 更新 API 路由

- [ ] 更新 `app/api/smart-suggestions/route.ts`
- [ ] 更新 `app/api/smart-suggestions/learning/route.ts`
- [ ] 更新 `app/api/common-notes/route.ts`

### 阶段 3: 简化 Repository 工厂

- [ ] 更新 `lib/infrastructure/repositories/index.server.ts` (移除 Supabase 分支)
- [ ] 评估并处理 `lib/infrastructure/repositories/index.ts`
- [ ] 简化 `lib/clients/db/index.ts`

### 阶段 4: 删除 Supabase 文件

- [ ] 删除 `lib/clients/supabase/` 目录
- [ ] 删除所有 `Supabase*Repository.ts` 文件
- [ ] 删除旧版服务文件 (已有 .server.ts 版本的)
- [ ] 删除 `lib/services/logging/SupabaseTransport.ts`
- [ ] 删除 `supabase/` 目录
- [ ] 删除 `scripts/migrate-payment-method.ts`

### 阶段 5: 更新类型定义

- [ ] 检查 `types/supabase.ts` 是否存在
- [ ] 更新 `types/database.ts`，移除 Supabase 类型依赖

### 阶段 6: 更新配置

- [ ] 更新 `package.json` (移除依赖，更新描述)
- [ ] 运行 `npm uninstall @supabase/supabase-js`
- [ ] 更新 `.env.local.example`
- [ ] 清理 `.env.local` 中的 Supabase 变量

### 阶段 7: 更新文档

- [ ] 更新 `CLAUDE.md`
- [ ] 更新 `README.md`
- [ ] 归档或删除 `MIGRATION_CHECKLIST.md`

### 阶段 8: 验证和测试

- [ ] 删除 `USE_PRISMA` 环境变量检查
- [ ] 运行 `npm run build` 确认无编译错误
- [ ] 运行 `npm run dev` 测试功能正常
- [ ] 测试所有关键功能

---

## 七、文件影响汇总

| 类型 | 数量 | 操作 |
|------|------|------|
| 需要删除的文件 | ~20 | 删除 |
| 需要修改的代码文件 | ~10 | 重构 |
| 需要更新的配置/文档 | ~5 | 更新 |
| package.json 依赖 | 1 | 移除 |

---

## 八、注意事项

1. **备份**: 在开始清理前，确保代码已提交并有备份
2. **渐进式**: 建议按阶段进行，每个阶段完成后测试
3. **USE_PRISMA**: 清理完成后，可移除此环境变量及相关判断逻辑
4. **类型兼容**: 如果有类型依赖 Supabase 生成的类型，需要手动定义或使用 Prisma 类型
5. **pg_cron**: `cronService.server.ts` 仍使用 pg_cron 扩展，这不依赖 Supabase SDK，可以保留

---

## 九、参考命令

```bash
# 卸载 Supabase 依赖
npm uninstall @supabase/supabase-js

# 删除 Supabase 客户端目录
rm -rf lib/clients/supabase

# 删除 Supabase Repository 文件
rm lib/infrastructure/repositories/Supabase*.ts

# 删除旧版服务文件 (请确认已有 .server.ts 版本)
rm lib/services/paymentMethodService.ts
rm lib/services/recurringExpenses.ts
rm lib/services/weeklyReportService.ts
rm lib/services/cronService.ts
rm lib/services/ai/AIFeedbackService.ts

# 删除 Supabase 日志传输器
rm lib/services/logging/SupabaseTransport.ts

# 删除 Supabase Schema
rm -rf supabase

# 验证构建
npm run build
```

---

*文档生成: Claude Code*
*最后更新: 2025-11-29*
