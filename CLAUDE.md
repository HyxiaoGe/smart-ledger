# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Smart Ledger 是一个现代化的智能记账应用，专注于支出记录和分析。基于 Next.js 14 + Supabase + DeepSeek AI 构建，提供直观的用户界面和强大的数据分析功能。

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
```

## 架构概览

### 技术栈
- **前端框架**: Next.js 14 (App Router)
- **数据库**: Supabase (PostgreSQL)
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
│   │   ├── common-notes/       # 智能备注 API
│   │   └── revalidate/         # 缓存刷新 API
│   ├── records/                # 账单列表页面
│   └── layout.tsx             # 根布局
├── components/                  # 共享组件
│   ├── ui/                     # 基础 UI 组件
│   ├── Navigation.tsx         # 导航组件
│   ├── NoteInput.tsx          # 智能备注输入组件
│   └── ...
├── lib/                        # 工具库和服务
│   ├── services/              # 业务逻辑服务
│   ├── supabaseClient.ts      # Supabase 客户端
│   ├── dataSync.ts            # 跨页面数据同步
│   ├── taskQueue.ts           # 任务队列管理器
│   └── aiClient.ts            # AI 服务客户端
├── types/                      # TypeScript 类型定义
└── supabase/                   # 数据库架构
```

## 关键开发模式

### 数据同步系统
项目使用自定义的跨页面数据同步机制 (`lib/dataSync.ts`)：
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

### 任务队列管理
使用通用任务队列 (`lib/taskQueue.ts`) 处理异步操作：
- 防止并发冲突
- 支持任务去重和状态追踪

## 环境配置

必需的环境变量 (`.env.local`)：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI 服务配置（可选其一或都配置）
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key

# AI 提供者（可选，默认 deepseek）
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

**note_analytics** - AI 分析数据表
- 用户无感知的后台分析数据
- 存储常见金额模式和偏好时间

### 数据库策略
- 启用行级安全策略 (RLS)
- 匿名访问权限（演示用途，生产环境建议用户隔离）

## API 路由

### `/api/analyze`
- 财务数据 AI 分析接口
- 返回 Markdown 格式的分析报告

### `/api/common-notes`
- 智能备注的增删改查
- 基于使用频率排序

### `/api/revalidate`
- 缓存刷新接口
- 用于数据更新后主动刷新缓存

## 开发约定

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件使用函数式写法和 React Hooks
- UI 样式基于 Tailwind CSS 工具类

### 提交规范
使用 `npm run commit` 进行标准化提交：
- 提交类型：feat, fix, docs, style, refactor, test, chore
- 提交信息使用中文描述
- 自动生成 Claude Code 协作标识

### 组件模式
- UI 组件放在 `components/ui/` 目录
- 页面组件放在对应 `app/` 路径下
- 业务逻辑服务放在 `lib/services/` 目录
- 工具函数放在 `lib/` 目录

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
2. **数据不同步**：确认 `dataSync.ts` 事件监听是否正常
3. **缓存过期**：调用 `/api/revalidate` 刷新缓存
4. **数据库连接失败**：验证 Supabase 配置和权限设置

### 调试技巧
- 使用浏览器开发者工具查看 localStorage 事件
- 检查 Network 面板中的 API 请求和响应
- 利用 Next.js 内置的错误堆栈追踪