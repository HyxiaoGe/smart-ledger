# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Smart Ledger 是一个现代化的智能记账应用，专注于支出记录和分析。基于 Next.js 14 + Prisma + DeepSeek AI 构建，提供直观的用户界面和强大的数据分析功能。

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 运行代码检查
npm run lint

# 代码格式化
npm run format

# 标准化提交（使用中文提交信息）
npm run commit

# Prisma 数据库迁移
npx prisma migrate dev

# 生成 Prisma 客户端
npx prisma generate
```

## 架构概览

### 技术栈
- **前端框架**: Next.js 14 (App Router)
- **ORM**: Prisma
- **数据库**: PostgreSQL (Docker 本地部署)
- **AI 服务**: DeepSeek API (可配置切换到 OpenAI)
- **UI 框架**: Tailwind CSS + Lucide React
- **图表**: Recharts
- **语言**: TypeScript

### 目录结构
```
smart-ledger/
├── app/                          # Next.js App Router 页面
│   ├── add/                     # 添加账单页面
│   ├── api/                     # API 路由
│   │   ├── analyze/            # AI 分析 API
│   │   ├── transactions/       # 交易 CRUD API
│   │   ├── payment-methods/    # 支付方式 API
│   │   ├── weekly-reports/     # 周报告 API
│   │   └── ...
│   ├── records/                # 账单列表页面
│   └── layout.tsx             # 根布局
├── components/                  # 共享组件
│   ├── ui/                     # 基础 UI 组件
│   ├── features/              # 功能组件
│   └── ...
├── lib/                        # 工具库和服务
│   ├── services/              # 业务逻辑服务 (*.server.ts 为服务端版本)
│   ├── clients/db/            # 数据库客户端 (Prisma)
│   ├── infrastructure/        # 基础设施层 (Repository)
│   ├── domain/                # 领域模型和接口
│   └── ...
├── prisma/                     # Prisma 配置和迁移
│   ├── schema.prisma          # 数据库模型定义
│   └── migrations/            # 数据库迁移文件
└── types/                      # TypeScript 类型定义
```

## 关键开发模式

### Repository 模式
项目使用 Repository 模式进行数据访问：
- 接口定义在 `lib/domain/repositories/`
- Prisma 实现在 `lib/infrastructure/repositories/prisma/`
- 通过 `lib/infrastructure/repositories/index.server.ts` 获取实例

### 服务层模式
- 服务端服务使用 `.server.ts` 后缀
- 客户端组件通过 API 路由调用服务
- 纯工具函数可在客户端直接导入

### 数据同步系统
项目使用自定义的跨页面数据同步机制 (`lib/core/EnhancedDataSync.ts`)：
- 基于 `localStorage` 事件的页面间通信
- 支持交易增删改操作的实时同步
- 使用 `useDataSync` Hook 监听数据变化

### 缓存策略
使用 Next.js `unstable_cache` 进行数据缓存：
- 交易列表查询缓存 60 秒
- 月度汇总数据缓存
- 通过 `revalidate` API 主动刷新缓存

### AI 服务集成
- 抽象化的 AI 客户端 (`lib/aiClient.ts`)
- 默认使用 DeepSeek，支持环境变量切换到 OpenAI
- 流式响应和非流式响应两种模式

## 环境配置

必需的环境变量 (`.env.local`)：

```env
# 数据库配置 (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/smart_ledger?schema=public

# AI 服务配置
DEEPSEEK_API_KEY=your_deepseek_api_key
AI_PROVIDER=deepseek
```

## 数据库架构

### 主要表结构

**transactions** - 交易记录表
- 支持收入/支出类型（当前主要使用 expense）
- 软删除机制 (`deleted_at` 字段)
- 多币种支持 (CNY/USD)

**common_notes** - 常用备注表
- 基于使用频率的智能备注推荐
- 自动统计使用次数和最后使用时间

**payment_methods** - 支付方式表
- 支持多种支付类型
- 使用统计和默认设置

**weekly_reports** - 周报告表
- 自动生成的周度消费分析

### Prisma 操作
```bash
# 生成 Prisma 客户端
npx prisma generate

# 创建迁移
npx prisma migrate dev --name <migration_name>

# 查看数据库
npx prisma studio
```

## API 路由

### `/api/transactions`
- 交易记录的 CRUD 操作
- 支持分页和筛选

### `/api/payment-methods`
- 支付方式管理
- 统计和默认设置

### `/api/weekly-reports`
- 周报告查询和生成

### `/api/ai-prediction`
- AI 预测服务（分类、金额、快速记账建议）

### `/api/analyze`
- 财务数据 AI 分析接口
- 返回 Markdown 格式的分析报告

## 开发约定

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件使用函数式写法和 React Hooks
- UI 样式基于 Tailwind CSS 工具类

### 服务端与客户端分离
- 数据库操作仅在服务端进行（API 路由或 Server Components）
- 客户端组件通过 fetch API 调用后端接口
- 服务端服务文件使用 `.server.ts` 后缀

### 提交规范
使用 `npm run commit` 进行标准化提交：
- 提交类型：feat, fix, docs, style, refactor, test, chore
- 提交信息使用中文描述

### 组件模式
- UI 组件放在 `components/ui/` 目录
- 功能组件放在 `components/features/` 目录
- 页面组件放在对应 `app/` 路径下
- 业务逻辑服务放在 `lib/services/` 目录

## 性能优化

### 缓存策略
- Next.js `unstable_cache` 缓存数据库查询
- 标签化缓存失效 (`tags: ['transactions']`)
- 合理的缓存时间设置 (60 秒)

### 数据同步
- 跨页面数据实时同步
- 避免重复数据请求
- 智能缓存失效机制

### 前端优化
- 响应式设计适配移动端
- 骨架屏加载状态
- 错误边界处理

## 故障排查

### 常见问题
1. **AI 服务无响应**：检查 API Key 配置和网络连接
2. **数据不同步**：确认 `EnhancedDataSync.ts` 事件监听是否正常
3. **缓存过期**：调用 `/api/revalidate` 刷新缓存
4. **数据库连接失败**：检查 DATABASE_URL 配置和 PostgreSQL 服务状态

### 调试技巧
- 使用浏览器开发者工具查看 localStorage 事件
- 检查 Network 面板中的 API 请求和响应
- 使用 `npx prisma studio` 查看数据库状态
- 利用 Next.js 内置的错误堆栈追踪
