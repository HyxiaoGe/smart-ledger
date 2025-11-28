# Smart Ledger 优化计划

> 创建日期: 2025-11-27
> 状态: 进行中

---

## 一、项目定位调整

- [x] 明确定位为「**支出追踪器**」，不再支持收入功能
- [ ] 更新相关 UI 文案和代码注释

---

## 二、架构优化（高优先级）

### 2.1 缓存策略简化

**现状问题：**
- 约 3,650+ 行缓存相关代码，分布在 8 个不同层级
- `dataSync.ts` 和 `EnhancedDataSync.ts` 功能重复（90% 相同）
- 3 套独立的预测缓存系统（TTL 不一致：5min/30min）
- localStorage 直接访问分散在 7 个文件，10+ 个 key 无统一管理
- 4+ 个独立的清理机制，存在内存泄漏风险

**简化方案：**

```
Phase 1: 合并数据同步 ✅ 已完成
├── ✅ 删除 dataSync.ts，统一使用 EnhancedDataSync.ts
├── ✅ 移除 3 个 @deprecated 文件（已完成迁移）
│   ├── ✅ aiCacheService.ts → 迁移到 memoryCache
│   ├── ✅ aiCacheServiceServer.ts → 迁移到 aiFeedbackService
│   └── ✅ aiFeedbackService.ts → 迁移到 @/lib/services/ai
└── ✅ 集中管理 localStorage keys（lib/config/storageKeys.ts）

Phase 2: 统一缓存层 ✅ 已完成
├── ✅ 创建 lib/config/cacheConfig.ts - 统一 TTL 策略
├── ✅ 删除 unifiedCache.ts（260 行）- 未使用
├── ✅ 迁移 predict/route.ts 使用 memoryCache
└── ✅ predictionCache/cacheManager 使用统一 TTL 配置

Phase 3: 生命周期管理（可选）
├── 创建 CacheLifecycleManager 统一清理
└── ✅ 已消除 unifiedCache 60s interval 内存泄漏（删除文件）
```

**已完成：**
- ✅ 删除 `dataSync.ts`（189 行）
- ✅ 迁移 4 个组件到 `useEnhancedDataSync`
- ✅ 删除 `aiCacheService.ts`（157 行）- 迁移引用到 `memoryCache`
- ✅ 删除 `aiCacheServiceServer.ts`（117 行）- 迁移引用到 `aiFeedbackService`
- ✅ 删除 `aiFeedbackService.ts`（265 行）- 迁移引用到 `@/lib/services/ai`
- ✅ 创建 `lib/config/storageKeys.ts` - 集中管理 10 个 localStorage keys
- ✅ 迁移 8 个文件的 localStorage 访问使用统一常量
- ✅ 创建 `lib/config/cacheConfig.ts` - 统一 TTL 策略配置
- ✅ 删除 `unifiedCache.ts`（260 行）- 完全未使用，内含内存泄漏
- ✅ 迁移 `predict/route.ts` 使用 `memoryCache`
- ✅ `predictionCache` 和 `cacheManager` 使用统一 TTL 配置

**预期收益：**
- 删除 ~1,000 行冗余代码
- 单一缓存失效模式
- 消除内存泄漏

**状态：** `Phase 1 & 2 完成，Phase 3 可选`

---

### 2.2 API 路由重复逻辑统一

**现状问题：**
- 15+ API 路由均直接调用 Supabase，未使用 Repository
- 错误处理、验证逻辑重复

**方案：**
- 所有 API 路由统一使用 `withErrorHandler` 中间件
- API 路由调用 Service 层，Service 调用 Repository
- 创建统一的请求验证工具

**已完成 (2025-11-28)：**
```
✅ 迁移到 withErrorHandler 的路由 (14/15):
├── transactions/today-auto-generated/route.ts
├── smart-suggestions/learning/route.ts
├── predict/route.ts
├── ai-prediction/route.ts
└── (已有10个路由使用 withErrorHandler)

⏸️ 保持特殊处理的路由 (1):
└── analyze/stream/route.ts (流式响应，需要特殊错误处理)
```

**状态：** `withErrorHandler 统一完成`

---

### 2.3 服务层依赖统一

**现状分析（2025-11-28 重新评估）：**

项目采用 **Service → PostgreSQL RPC** 架构模式，这是合理的设计：
- budgetService.ts: 6 个 RPC 调用 (`set_budget`, `get_monthly_budget_status`, `delete_budget` 等)
- paymentMethodService.ts: 6 个 RPC 调用 (`add_payment_method`, `get_payment_methods_with_stats` 等)
- recurringExpenses.ts: RPC 调用 (`generate_recurring_transactions`)

**RPC vs Repository 模式评估：**
```
✅ 当前 RPC 模式的优势:
├── 复杂业务逻辑在数据库层保证数据完整性
├── 事务处理在存储过程中原子执行
├── 减少网络往返，性能更好
└── Service 层保持简洁

⚠️ Repository 模式更适用于:
├── 简单 CRUD 操作
├── 需要换数据源的场景
└── 复杂查询组合

📊 结论: 保持现有 RPC 架构，Repository 仅用于简单 CRUD
```

**已有 Repository 使用情况（维持现状）：**
- ITransactionRepository ✅ 用于 TransactionQueryService/SummaryService/AnalyticsService
- ICategoryRepository ✅ 用于 categoryService
- IBudgetRepository ⚠️ 已有接口，但 budgetService 使用 RPC 更合适
- ICommonNoteRepository ✅ 用于 commonNotesService

**状态：** `评估完成 - 保持现有架构`

---

### 2.4 类型定义整合

**现状问题：**
- 210 处使用 `any` 类型
- 131 个内联类型定义分散在组件和服务中
- 2 个重复类型定义（TrendAnalysisData, PersonalizedAdviceData）
- 缺少 `types/supabase.ts` 自动生成文件

**方案：**

```
Priority 1: 消除重复 ✅ 已完成
├── ✅ 移除 TrendAnalysis.tsx 中重复的 TrendAnalysisData
└── ✅ 移除 OptimizationAdvice.tsx 中重复的 PersonalizedAdviceData

Priority 2: 创建通用类型 ✅ 已完成
├── ✅ types/ui/chart.ts: ChartTooltipProps, ChartLegendProps, TooltipPayloadItem
└── ✅ types/common/index.ts: QueryFilter, SortOptions, PaginationOptions, getErrorMessage

Priority 3: 替换图表组件 any 类型 ✅ 已完成
├── ✅ CategoryStatistics.tsx - CustomTooltip, CustomLegend
├── ✅ PredictionTrendChart.tsx - CustomTooltip, CategoryTooltip
└── ✅ ChartSummary.tsx - CustomTooltip, currencyTick, Legend formatter

Priority 4: 重组类型目录 ✅ 已完成
types/
├── common/     # 通用类型 ✅
├── domain/     # 领域类型
├── dto/        # 数据传输对象
├── database/   # 数据库类型
├── ui/         # UI 组件类型 ✅
└── ai-feedback/# AI 反馈类型

待处理:
└── 服务层 AIRequestContext
```

**已完成：**
- ✅ 移除 2 个重复类型定义（TrendAnalysisData, PersonalizedAdviceData）
- ✅ 创建 `types/ui/chart.ts` - Recharts 类型定义
- ✅ 创建 `types/common/index.ts` - 通用工具类型（含 getErrorMessage, isAbortError）
- ✅ 更新 `types/index.ts` 导出新模块
- ✅ 修复 3 个图表组件的 `any` 类型（共 8 处）
- ✅ 修复 19 处 `catch (error: any)` → `catch (error: unknown)`

**状态：** `Priority 1-3 完成，错误处理完成，Priority 4 部分完成`

---

## 三、UI/UX 优化（中优先级）

### 3.1 移动端适配

**方案：**
- 添加响应式底部导航（仅移动端显示）
- 设置页面使用 Sheet/Drawer 组件
- 表单布局优化（单列布局 on mobile）

**实施条件：** 不影响现有桌面端体验

**状态：** `待评估`

---

### 3.2 设置层级优化

**现状：** 20 个设置页面，最深 4 层嵌套

**建议方案：**

```
方案 A: Tab 式扁平化（推荐）
/settings
├── [Tab] 支出设置
│   ├── 分类管理
│   ├── 支付方式
│   ├── 周期支出
│   └── 预算管理
├── [Tab] AI 设置
│   ├── AI 分析
│   └── AI 反馈
└── [Tab] 系统设置
    ├── 通知
    ├── 数据
    └── 高级

方案 B: 侧边栏导航
/settings 页面左侧固定导航，右侧内容区

方案 C: 保持现状 + 面包屑优化
添加更清晰的面包屑导航和返回按钮
```

**状态：** `待讨论`

---

### 3.3 表单体验优化

- [ ] 金额输入：移除默认 "0"，使用 placeholder
- [ ] 删除操作：添加确认弹窗
- [ ] 批量操作：添加批量删除/分类功能

**状态：** `待开始`

---

### 3.4 空状态引导

- [ ] Top 10 支出空状态插图和引导
- [ ] 图表空状态展示
- [ ] 首次使用引导流程

**状态：** `待开始`

---

### 3.5 统一图标库

**现状：** 混用 emoji 和 Lucide React

**方案：** 导航栏图标统一使用 Lucide React

```tsx
// Before
{ href: '/', label: '首页', icon: '🏠' }

// After
import { Home, PlusCircle, FileText, Settings, LucideIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: Home },
  { href: '/add', label: '添加账单', icon: PlusCircle },
  { href: '/records', label: '账单列表', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings }
];
```

**已完成：**
- Navigation.tsx 导航栏图标从 emoji 替换为 Lucide React
- 添加 NavItem 类型定义，使用 LucideIcon 类型
- 分类/消费类型 emoji（🍽️🚇💪等）保留，因为它们是表意性内容图标

**状态：** `已完成`

---

### 3.6 级联选择器优化

**现状：** 三级分类（主分类→子分类→商家）使用独立 select

**方案：**
```tsx
// 使用 Cascader 组件
// Supabase API 调用优化：
// 1. 一次性获取所有分类数据（已有 CategoryContext 缓存）
// 2. 前端构建级联树结构
// 3. 无需额外 API 调用

const cascaderOptions = categories.map(cat => ({
  value: cat.key,
  label: cat.label,
  children: cat.subcategories?.map(sub => ({
    value: sub.key,
    label: sub.label,
    children: sub.merchants?.map(m => ({
      value: m,
      label: m
    }))
  }))
}));
```

**状态：** `待开始`

---

## 四、性能优化（中优先级）

### 4.1 首页数据加载优化

**两种方案对比：**

| 方案 | 可行度 | 复杂度 | 收益 |
|------|--------|--------|------|
| **数据聚合 API** | ⭐⭐⭐⭐⭐ | 低 | 减少请求数 |
| 流式加载 | ⭐⭐⭐ | 高 | 渐进式渲染 |

**推荐方案：数据聚合 API**

```typescript
// 创建 /api/home-data 聚合接口
// 合并: 趋势数据 + 饼图 + Top10 + 周期支出
export async function GET(request: NextRequest) {
  const [trend, pie, top10, recurring] = await Promise.all([
    getTrendData(),
    getPieData(),
    getTop10(),
    getRecurringExpenses()
  ]);

  return NextResponse.json({ trend, pie, top10, recurring });
}
```

**理由：**
- 实现简单，改动小
- 减少 HTTP 请求数（4→1）
- 服务端 Promise.all 已优化
- 不需要修改前端渲染逻辑

**状态：** `待开始`

---

## 五、安全性优化

### 5.1 RLS 策略加固

**现状：** 匿名访问策略过于宽松

**方案（内网部署场景）：**
```sql
-- 限制危险操作，保留基本读写
-- 1. 禁止批量删除
CREATE POLICY "prevent_bulk_delete" ON transactions
  FOR DELETE USING (
    -- 单次只能删除一条
    (SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL) > 1
  );

-- 2. 添加操作审计日志
-- 3. 限制单日最大操作次数（可选）
```

**状态：** `待评估`

---

## 六、待规划功能

以下功能暂不实施，记录在此供后续参考：

- [ ] 数据导出功能（CSV/Excel/PDF）
- [ ] 单元测试覆盖
- [ ] 多币种汇率支持
- [ ] 快速记账页面真实统计
- [ ] AI 分析响应优化
- [ ] 日志数据脱敏

---

## 七、实施顺序建议

```
第一阶段（架构基础）: 2.1 → 2.4 → 2.3 → 2.2
第二阶段（UI/UX）: 3.5 → 3.3 → 3.4 → 3.2 → 3.1 → 3.6
第三阶段（性能）: 4.1
第四阶段（安全）: 5.1
```

---

## 八、复盘记录

| 日期 | 完成项 | 问题/经验 |
|------|--------|----------|
| 2025-11-27 | 创建计划文档 | 调研发现缓存系统过于复杂 |
| 2025-11-27 | 删除 dataSync.ts，迁移 4 个组件 | @deprecated 文件有外部引用，需要额外迁移工作 |
| 2025-11-27 | 删除 3 个 @deprecated 文件（728 行） | 迁移引用到统一服务，需要处理同步/异步 API 差异 |
| 2025-11-28 | Phase 1 完成：集中管理 localStorage keys | 创建 storageKeys.ts，迁移 8 个文件，统一 10 个 key |
| 2025-11-28 | Phase 2 完成：统一缓存层 | 删除 unifiedCache.ts(260行)，创建 cacheConfig.ts，消除内存泄漏 |
| 2025-11-28 | 2.4 类型定义整合（Priority 1-3） | 创建 chart.ts、common/index.ts，修复 8 处图表 any 类型 |
| 2025-11-28 | 2.4 错误处理类型安全 | 修复 19 处 catch (error: any)，添加 isAbortError 工具函数 |
| 2025-11-28 | 2.3 服务层评估完成 | RPC 架构合理，保持现状；Repository 用于简单 CRUD |
| 2025-11-28 | 2.2 API 路由统一 | 14/15 路由使用 withErrorHandler，流式响应保持特殊处理 |

