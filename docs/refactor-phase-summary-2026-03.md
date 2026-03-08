# 支出记账项目阶段性重构总结

更新时间：2026-03-08  
阶段收尾版本：`6c7094f`

## 1. 本轮目标

本轮重构的目标不是功能重写，而是把已经演化得较分散的主链重新收口，重点解决以下问题：

- 交易查询、写入、刷新、副作用链路分散
- 首页、记录页、快速记账存在较多页面层业务拼装
- 固定支出存在双实现、双入口、双语义残留
- 预算、周报、月报、AI 分析/预测的数据入口不统一
- 部署链路缺少稳定版本追踪和更可靠的自动化脚本

## 2. 本轮已完成的核心成果

### 2.1 交易主链收口

- 统一了交易查询主链、写入主链、写入后客户端副作用链。
- 首页、记录页、快速记账不再大量依赖页面层直接拼业务逻辑。
- 交易范围解析、查询参数更新、月度/单日/全量列表查询逐步收回正式 service 和 hooks。
- 记录页从“整页刷新兜底”推进到“正式 query + refetch”为主的数据流。

代表性改动：

- [lib/services/transaction/TransactionQueryService.ts](/Users/sean/code/smart-ledger/lib/services/transaction/TransactionQueryService.ts)
- [lib/services/transaction/TransactionMutationService.ts](/Users/sean/code/smart-ledger/lib/services/transaction/TransactionMutationService.ts)
- [lib/api/transactionWriteEffects.ts](/Users/sean/code/smart-ledger/lib/api/transactionWriteEffects.ts)
- [lib/api/hooks/useTransactions.ts](/Users/sean/code/smart-ledger/lib/api/hooks/useTransactions.ts)
- [lib/services/transaction/pageParams.ts](/Users/sean/code/smart-ledger/lib/services/transaction/pageParams.ts)

### 2.2 首页与记录页边界收口

- 首页和记录页的 `searchParams` 解析、视图数据切片、刷新停止条件、页面层默认值逐步下沉。
- 页面文件本身已经从“承担大量业务编排”转向“参数解析 + 渲染 view data”。
- 首页 client 的刷新逻辑和热力图跳转逻辑已经抽到专门 hook。
- 记录页的 header、summary、category statistics、list view 已由 service 直接产出。

代表性改动：

- [app/page.tsx](/Users/sean/code/smart-ledger/app/page.tsx)
- [app/page-client.tsx](/Users/sean/code/smart-ledger/app/page-client.tsx)
- [app/records/page.tsx](/Users/sean/code/smart-ledger/app/records/page.tsx)
- [lib/services/transaction/TransactionDashboardService.ts](/Users/sean/code/smart-ledger/lib/services/transaction/TransactionDashboardService.ts)
- [lib/services/transaction/TransactionRecordsPageService.ts](/Users/sean/code/smart-ledger/lib/services/transaction/TransactionRecordsPageService.ts)
- [lib/types/transactionViews.ts](/Users/sean/code/smart-ledger/lib/types/transactionViews.ts)

### 2.3 Quick 记账链路收口

- Quick 相关组件的提交逻辑、成功提示、默认支付方式、建议卡片渲染、弹层壳、导航逻辑已统一。
- 快速记账相关入口不再继续走旧旁路或大量 `window.location.reload()` / `window.open()`。
- 首页 quick、弹窗 quick、独立 `/quick` 页的行为语义已经大体对齐。

代表性改动：

- [components/features/transactions/QuickTransaction](/Users/sean/code/smart-ledger/components/features/transactions/QuickTransaction)
- [lib/api/hooks/useTransactions.ts](/Users/sean/code/smart-ledger/lib/api/hooks/useTransactions.ts)

### 2.4 固定支出主链收口

- 旧的 `recurringService.server.ts` 主职责已退出主链。
- 固定支出的 `history / stats / generate / overview` 现在有正式 canonical 路径和 service 入口。
- 固定支出页面不再继续依赖 legacy `/api/recurring/*` 作为主调用面。
- 生成响应模型已统一，前端生成入口也切到了正式 hooks。

代表性改动：

- [lib/services/recurringExpenses.server.ts](/Users/sean/code/smart-ledger/lib/services/recurringExpenses.server.ts)
- [app/api/recurring-expenses/history/route.ts](/Users/sean/code/smart-ledger/app/api/recurring-expenses/history/route.ts)
- [app/api/recurring-expenses/stats/route.ts](/Users/sean/code/smart-ledger/app/api/recurring-expenses/stats/route.ts)
- [app/api/recurring-expenses/overview/route.ts](/Users/sean/code/smart-ledger/app/api/recurring-expenses/overview/route.ts)
- [lib/api/hooks/useRecurringExpenses.ts](/Users/sean/code/smart-ledger/lib/api/hooks/useRecurringExpenses.ts)

### 2.5 预算/周报/月报/分析入口统一

- 预算新增了 overview 聚合入口，预算页不再自己拆三四条查询。
- 月报和周报页面回到正式 hooks，不再各自手写 query/mutation/queryClient。
- 周报 API 返回契约与月报保持一致，统一成 `success + data` 形状。
- 交易分析 service 最后一批已补上正式月度 bundle 入口，用同一条主链产出 AI 分析与预测数据。

代表性改动：

- [app/api/budgets/overview/route.ts](/Users/sean/code/smart-ledger/app/api/budgets/overview/route.ts)
- [lib/services/budgetService.server.ts](/Users/sean/code/smart-ledger/lib/services/budgetService.server.ts)
- [lib/api/hooks/useMonthlyReports.ts](/Users/sean/code/smart-ledger/lib/api/hooks/useMonthlyReports.ts)
- [app/api/weekly-reports/route.ts](/Users/sean/code/smart-ledger/app/api/weekly-reports/route.ts)
- [lib/services/transaction/TransactionAnalyticsService.ts](/Users/sean/code/smart-ledger/lib/services/transaction/TransactionAnalyticsService.ts)
- [app/api/predict/route.ts](/Users/sean/code/smart-ledger/app/api/predict/route.ts)

### 2.6 部署链路稳定化

- 镜像/容器已注入 `APP_GIT_SHA`，线上版本可直接追踪。
- 部署脚本统一到了 [scripts/deploy.sh](/Users/sean/code/smart-ledger/scripts/deploy.sh)。
- workflow 和脚本的职责边界更清楚：env 准备、容器清理、重建、探活都尽量收在脚本中。
- 脚本对 `.env.local` 缺失、残留容器、服务未真正启动等情况已有更强兜底。

代表性改动：

- [Dockerfile](/Users/sean/code/smart-ledger/Dockerfile)
- [docker-compose.yml](/Users/sean/code/smart-ledger/docker-compose.yml)
- [scripts/deploy.sh](/Users/sean/code/smart-ledger/scripts/deploy.sh)
- [/.github/workflows/deploy.yml](/Users/sean/code/smart-ledger/.github/workflows/deploy.yml)

## 3. 这一轮明确避免了什么

本轮后半段有意识地停止了继续“纯 UI 壳层打薄”的方向，避免进一步沉没在低边际收益的组件拆分里。后续如果继续重构，应优先继续处理：

- 业务主链
- service 边界
- 查询口径
- 测试覆盖

而不是继续为了结构洁癖拆更多展示组件。

## 4. 当前状态判断

截至 `6c7094f`，项目已经脱离“主链分散、边界模糊、页面承担过多业务编排”的状态，进入了“可以继续正常演进”的状态。

更具体地说：

- 交易主链已基本稳定
- 首页、记录页、quick 已不再是高混乱区
- 固定支出主链已不再存在明显双实现主干冲突
- 预算/报表/分析入口已经有比较清晰的正式调用面
- 部署链路可追踪、可自动化、可验证

## 5. 本轮验证结果

本轮多次通过远端真实 `next build`、容器重建、线上探活进行验证。阶段收尾版本 `6c7094f` 已验证通过的关键页面和接口包括：

- `/`
- `/add`
- `/quick`
- `/records`
- `/records?range=thisMonth`
- `/settings/expenses/budget`
- `/settings/expenses/monthly-reports`
- `/settings/expenses/weekly-reports`
- `/settings/expenses/recurring/history`
- `/api/budgets/overview`
- `/api/recurring-expenses/history`
- `/api/recurring-expenses/stats`
- `/api/recurring-expenses/overview`
- `/api/weekly-reports`
- `/api/weekly-reports/latest`
- `/api/monthly-reports`
- `/api/predict`（已用真实 `POST` 验证）

## 6. 当前仍可继续做，但不属于本轮必须项

以下内容属于下一阶段优化，不影响本轮收工：

- 为交易主链、固定支出主链、预算 overview、月度分析 bundle 补系统化单元测试
- 继续收紧 AI/预测相关页面与 service 之间的展示数据契约
- 清理仍存在的少量 legacy API 兼容面
- 做一轮针对首页/记录页/quick/固定支出的回归测试清单固化
- 如果需要，再做下一阶段性能和缓存策略优化

## 7. 建议的下一阶段优先级

如果后续继续推进，建议优先级如下：

1. 补测试，而不是继续拆 UI
2. 固化回归验证路径
3. 再考虑进一步收 legacy 兼容面
4. 最后再做性能与缓存优化

## 8. 一句话结论

本轮重构已经完成了“把项目从多条平行实现和页面重编排，收回到更清晰的 service/hook 主链”的核心目标，适合在此作为一个阶段性里程碑收尾。
