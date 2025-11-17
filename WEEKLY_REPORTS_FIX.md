# 周报功能修复指南

## 🔍 问题诊断

周报功能无法显示数据的原因是**命名不匹配**：

| 组件 | 前端期望 | 数据库实际 | 状态 |
|------|---------|-----------|------|
| 表名 | `weekly_reports` | `weekly_consumption_reports` | ❌ 不匹配 |
| 函数名 | `generate_weekly_report` | `generate_weekly_consumption_report` | ❌ 不匹配 |
| 支付字段 | `payment_method_stats` | `payment_method_breakdown` | ❌ 不匹配 |
| AI 字段 | `ai_insights` | `ai_summary` | ❌ 不匹配 |
| JSONB 键 | `method` | `payment_method` | ❌ 不匹配 |

---

## ✅ 修复方案

### 方案一：完整重建（推荐）

如果你的 `weekly_consumption_reports` 表**还没有重要数据**，建议完全重建：

```bash
# 1. 在 Supabase SQL Editor 中按顺序执行：

# 第一步：删除旧表和函数
DROP TABLE IF EXISTS weekly_consumption_reports CASCADE;
DROP FUNCTION IF EXISTS generate_weekly_consumption_report();

# 第二步：创建新表结构
# 执行 supabase/migrations/create_weekly_reports_table.sql

# 第三步：创建新函数
# 执行 supabase/migrations/fix_weekly_reports_naming.sql
```

### 方案二：数据迁移（保留已有数据）

如果你已经有数据需要保留：

```sql
-- 1. 备份数据
CREATE TABLE weekly_consumption_reports_backup AS
SELECT * FROM weekly_consumption_reports;

-- 2. 执行 fix_weekly_reports_naming.sql
-- 这会自动重命名表和字段

-- 3. 验证数据
SELECT * FROM weekly_reports LIMIT 5;
```

---

## 🚀 执行步骤

### Step 1: 连接到 Supabase

```bash
# 方式1: 使用 Supabase Dashboard
# 访问: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

### Step 2: 执行迁移脚本

```bash
# 在 SQL Editor 中依次执行：

# 1. 创建表结构（如果表不存在）
-- 复制粘贴 supabase/migrations/create_weekly_reports_table.sql

# 2. 修复命名（如果表已存在但命名不对）
-- 复制粘贴 supabase/migrations/fix_weekly_reports_naming.sql
```

### Step 3: 验证修复

```sql
-- 1. 检查表结构
\d weekly_reports

-- 2. 测试函数调用
SELECT * FROM generate_weekly_report();

-- 3. 查看生成的报告
SELECT * FROM weekly_reports ORDER BY week_start_date DESC LIMIT 1;
```

### Step 4: 前端测试

```bash
# 1. 重启开发服务器
npm run dev

# 2. 访问周报页面
# http://localhost:3000/settings/expenses/weekly-reports

# 3. 点击"手动生成报告"按钮

# 4. 查看是否有数据显示
```

---

## 📋 检查清单

验证以下项目全部通过：

- [ ] 表名是 `weekly_reports`（不是 `weekly_consumption_reports`）
- [ ] 函数名是 `generate_weekly_report()`
- [ ] 字段包含 `payment_method_stats`（不是 `payment_method_breakdown`）
- [ ] 字段包含 `ai_insights`（不是 `ai_summary`）
- [ ] JSONB 中使用 `method` 键（不是 `payment_method`）
- [ ] 前端能成功调用 `generateWeeklyReport()`
- [ ] 前端能正常显示报告列表
- [ ] 点击报告能查看详情页

---

## 🔧 快速测试命令

在 Supabase SQL Editor 中执行：

```sql
-- 1. 检查表是否存在且命名正确
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%weekly%';

-- 2. 检查函数是否存在
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%weekly%';

-- 3. 检查表结构
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weekly_reports'
ORDER BY ordinal_position;

-- 4. 手动生成一份报告测试
SELECT * FROM generate_weekly_report();

-- 5. 验证报告数据
SELECT
  id,
  week_start_date,
  week_end_date,
  total_expenses,
  transaction_count,
  generation_type
FROM weekly_reports
ORDER BY week_start_date DESC;
```

---

## ⚠️ 常见问题

### Q1: 执行脚本时报错 "table already exists"
**解决方案**: 先删除旧表再执行
```sql
DROP TABLE IF EXISTS weekly_reports CASCADE;
DROP TABLE IF EXISTS weekly_consumption_reports CASCADE;
```

### Q2: 函数调用返回错误
**检查**: 确认函数名称是否正确
```sql
-- 应该是这个名称（不带 consumption）
SELECT * FROM generate_weekly_report();
```

### Q3: 前端显示"暂无周报告数据"
**排查步骤**:
1. 检查数据库中是否有数据: `SELECT COUNT(*) FROM weekly_reports;`
2. 检查字段名是否匹配: `\d weekly_reports`
3. 检查是否有交易数据: `SELECT COUNT(*) FROM transactions WHERE type = 'expense' AND deleted_at IS NULL;`

### Q4: 报告详情页显示不完整
**检查 JSONB 字段格式**:
```sql
SELECT
  payment_method_stats,
  category_breakdown,
  top_merchants
FROM weekly_reports
LIMIT 1;
```

确保 JSON 键名匹配：
- `payment_method_stats` 中应该有 `method` 键（不是 `payment_method`）
- `category_breakdown` 中应该有 `category`, `amount`, `count`, `percentage`
- `top_merchants` 中应该有 `merchant`, `amount`, `count`

---

## 📝 已修复的文件

1. ✅ `lib/services/cronService.ts` - 添加了函数映射
2. ✅ `supabase/migrations/create_weekly_reports_table.sql` - 新建表脚本
3. ✅ `supabase/migrations/fix_weekly_reports_naming.sql` - 修复脚本

---

## 🎯 下一步

修复完成后，建议：

1. **设置定时任务**: 在 Supabase 中配置 pg_cron 每周自动生成报告
   ```sql
   SELECT cron.schedule(
     'generate-weekly-report',
     '0 1 * * 1',  -- 每周一凌晨1点执行
     $$SELECT generate_weekly_report()$$
   );
   ```

2. **测试手动生成**: 在设置页面点击"手动生成报告"按钮

3. **添加 AI 洞察**: 后续可以集成 DeepSeek AI 生成更智能的分析

---

## 💡 提示

- 修复后记得重启前端开发服务器
- 建议在开发环境先测试，确认无误后再应用到生产环境
- 定期检查定时任务的执行日志
