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
Phase 1: 合并数据同步（1-2天）
├── 删除 dataSync.ts，统一使用 EnhancedDataSync.ts
├── 移除 3 个 @deprecated 文件（~527 行）
└── 集中管理 localStorage keys

Phase 2: 统一缓存层（3-5天）
├── 合并 predictionCache + cacheManager + unifiedCache
├── 统一 TTL 策略（写入 constants/cacheConfig.ts）
└── 使用 infrastructure/cache 作为唯一缓存层

Phase 3: 生命周期管理（2-3天）
├── 创建 CacheLifecycleManager 统一清理
└── 修复 unifiedCache 60s interval 内存泄漏
```

**预期收益：**
- 删除 ~1,000 行冗余代码
- 单一缓存失效模式
- 消除内存泄漏

**状态：** `待开始`

---

### 2.2 API 路由重复逻辑统一

**现状问题：**
- 15+ API 路由均直接调用 Supabase，未使用 Repository
- 错误处理、验证逻辑重复

**方案：**
- 所有 API 路由统一使用 `withErrorHandler` 中间件
- API 路由调用 Service 层，Service 调用 Repository
- 创建统一的请求验证工具

**状态：** `待开始`

---

### 2.3 服务层依赖统一

**现状问题：**
- 32 个服务中仅 3 个（9%）使用 Repository 模式
- 50% 服务直接调用 Supabase
- 已有的 Repository 接口利用率约 50%

**方案：**

```
Week 1: 补充缺失的 Repository 接口
├── IPaymentMethodRepository
├── IRecurringExpenseRepository
└── ISmartPatternRepository

Week 2: 迁移高优先级服务
├── budgetService.ts → 使用 IBudgetRepository
├── paymentMethodService.ts → 使用新 Repository
└── recurringExpenses.ts → 使用新 Repository

Week 3: 迁移 API 路由
└── 所有 15+ 路由改用 Service/Repository

Week 4: 标准化服务模式
└── 统一 Service 类 + Factory 模式
```

**状态：** `待开始`

---

### 2.4 类型定义整合

**现状问题：**
- 210 处使用 `any` 类型
- 131 个内联类型定义分散在组件和服务中
- 2 个重复类型定义（TrendAnalysisData, PersonalizedAdviceData）
- 缺少 `types/supabase.ts` 自动生成文件

**方案：**

```
Priority 1: 消除重复（1小时）
├── 移除 TrendAnalysis.tsx 中重复的 TrendAnalysisData
└── 移除 OptimizationAdvice.tsx 中重复的 PersonalizedAdviceData

Priority 2: 创建通用类型（2小时）
└── types/common/index.ts: QueryFilter, SortOptions, PaginationOptions

Priority 3: 替换 any 类型（10小时）
├── 图表组件 TooltipProps, LegendProps
├── 服务层 AIRequestContext
└── 错误处理 catch (error: unknown)

Priority 4: 重组类型目录（3小时）
types/
├── common/     # 通用类型
├── domain/     # 领域类型
├── dto/        # 数据传输对象
├── api/        # API 请求/响应类型
├── ui/         # UI 组件类型
└── services/   # 服务类型
```

**状态：** `待开始`

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
import { Home, Plus, List, Settings } from 'lucide-react';
{ href: '/', label: '首页', icon: Home }
```

**状态：** `待开始`

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

