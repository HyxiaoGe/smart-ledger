# 💰 Smart Ledger

一个现代化的智能记账应用，专注于支出记录和分析，提供直观的用户界面和强大的数据分析功能。

## ✨ 功能特性

### 🎯 核心功能

- **支出记录** - 简单快捷的支出记录界面
- **智能备注** - 基于使用习惯的智能备注推荐
- **数据可视化** - 直观的图表展示和分析
- **多币种支持** - 支持人民币(CNY)和美元(USD)
- **AI智能分析** - 基于 DeepSeek AI 的消费分析和建议

### 📊 数据分析

- **类别占比分析** - 饼图展示各类别支出占比
- **支出趋势分析** - 按日展示支出变化趋势
- **Top 10 支出** - 大额支出记录快速查看
- **今日/本月切换** - 灵活的时间范围选择
- **图表联动** - 图表间数据同步更新

### 🎨 用户界面

- **响应式设计** - 完美适配桌面和移动设备
- **现代化UI** - 基于 Tailwind CSS 的精美界面
- **直观导航** - 清晰的页面结构和导航体验
- **交互反馈** - 流畅的动画和状态反馈

## 🛠 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI组件**: Tailwind CSS + Lucide React
- **图表库**: Recharts
- **数据库**: PostgreSQL + Prisma ORM
- **AI服务**: DeepSeek API
- **语言**: TypeScript
- **状态管理**: React Hooks + URL参数

## 📁 项目结构

```
smart-ledger/
├── app/                          # Next.js App Router
│   ├── add/                     # 添加账单页面
│   ├── api/                     # API路由
│   │   ├── analyze/            # AI分析API
│   │   └── common-notes/       # 智能备注API
│   ├── components/             # 页面组件
│   ├── records/                # 账单列表页面
│   └── layout.tsx             # 根布局
├── components/                  # 共享组件
│   ├── ui/                     # UI基础组件
│   ├── Navigation.tsx         # 导航组件
│   ├── NoteInput.tsx          # 备注输入组件
│   └── ...
├── lib/                        # 工具库
│   ├── clients/db/            # 数据库客户端 (Prisma)
│   ├── config.ts              # 配置文件
│   ├── taskQueue.ts           # 通用任务队列管理器
│   ├── dataSync.ts            # 跨页面数据同步
│   └── ...
├── types/                      # TypeScript类型定义
└── prisma/                     # Prisma Schema 和迁移
```

## 🚀 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd smart-ledger
```

2. **安装依赖**

```bash
npm install
```

3. **环境配置**

创建 `.env.local` 文件并添加以下环境变量：

```env
# 数据库配置 (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/smart_ledger

# AI 服务配置
DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. **数据库设置**

- 确保 PostgreSQL 数据库运行中
- 运行 `npx prisma generate` 生成 Prisma Client
- 运行 `npx prisma db push` 或 `npx prisma migrate dev` 初始化数据库

5. **启动开发服务器**

```bash
npm run dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

## 📖 使用指南

### 添加支出记录

1. 点击导航栏中的"添加账单"
2. 填写支出信息：
   - **分类**: 选择支出类别（餐饮、交通、购物等）
   - **金额**: 输入支出金额
   - **币种**: 选择货币类型（CNY/USD）
   - **日期**: 选择支出日期
   - **备注**: 可选的详细说明
3. 点击"保存账单"

### 查看支出记录

1. 点击导航栏中的"账单列表"
2. 浏览所有支出记录
3. 支持编辑和删除操作

### 数据分析

1. 在首页查看：
   - **图表概览**: 类别占比饼图和支出趋势
   - **Top 10 支出**: 大额支出记录
   - **时间筛选**: 今日/本月数据切换

2. **AI 分析**：
   - 点击"AI 分析"按钮
   - 获取智能消费分析报告
   - 查看支出建议和趋势分析

## 🔧 开发指南

### 可用脚本

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 运行代码检查
npm run lint
```

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件使用函数式写法和 React Hooks
- UI 样式基于 Tailwind CSS 工具类

### 提交规范

使用标准化的提交信息格式：

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建工具或辅助工具的变动
```

## 🗃 数据库结构

### transactions 表

| 字段       | 类型      | 描述                         |
| ---------- | --------- | ---------------------------- |
| id         | UUID      | 主键                         |
| type       | enum      | 交易类型（固定为 'expense'） |
| category   | string    | 支出分类                     |
| amount     | numeric   | 支出金额                     |
| date       | date      | 支出日期                     |
| note       | text      | 备注说明                     |
| currency   | string    | 货币类型（CNY/USD）          |
| deleted_at | timestamp | 软删除时间戳                 |

### common_notes 表

| 字段        | 类型      | 描述         |
| ----------- | --------- | ------------ |
| id          | UUID      | 主键         |
| content     | string    | 备注内容     |
| usage_count | integer   | 使用次数     |
| last_used   | timestamp | 最后使用时间 |
| created_at  | timestamp | 创建时间     |
| is_active   | boolean   | 是否启用     |

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 全栈框架
- [Prisma](https://www.prisma.io/) - 现代 TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Recharts](https://recharts.org/) - React 图表库
- [DeepSeek](https://www.deepseek.ai/) - AI 分析服务

---

**Smart Ledger** - 让记账变得简单智能 🎯
