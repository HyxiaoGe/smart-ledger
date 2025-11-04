# 数据库迁移说明

## 问题描述

支付方式管理功能报错：`column t.payment_method does not exist`

原因：`transactions` 表中缺少 `payment_method` 字段。

## 解决方案

### 方法一：使用 Supabase Dashboard（推荐）

这是最简单、最可靠的方法：

1. **访问 Supabase Dashboard**
   - 打开你的 Supabase 项目
   - 或访问：https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

2. **打开 SQL Editor**
   - 在左侧菜单中找到 "SQL Editor"
   - 点击 "New query"

3. **执行迁移 SQL**
   - 打开文件 `supabase/migrations/add_payment_method_to_transactions.sql`
   - 复制所有内容
   - 粘贴到 SQL Editor 中
   - 点击 "Run" 按钮执行

4. **验证结果**
   - 执行成功后，刷新浏览器
   - 返回应用的支付方式管理页面
   - 检查是否能正常加载支付方式列表

### 方法二：使用命令行脚本

如果你更喜欢使用命令行：

```bash
# 安装 tsx（如果还没安装）
npm install -D tsx

# 运行迁移脚本
npx tsx scripts/migrate-payment-method.ts
```

**注意**：由于 Supabase 客户端的限制，命令行脚本可能无法完全自动执行。如果遇到问题，请使用方法一。

## 迁移内容

此迁移会进行以下操作：

1. ✅ 为 `transactions` 表添加 `payment_method` 字段（TEXT 类型）
2. ✅ 创建索引以提升查询性能
3. ✅ 将现有交易记录关联到默认支付方式（如果存在）
4. ✅ 添加数据完整性检查函数

## 迁移后的数据结构

```sql
-- transactions 表新增字段
ALTER TABLE public.transactions
ADD COLUMN payment_method TEXT;

-- 索引
CREATE INDEX idx_transactions_payment_method
ON public.transactions(payment_method)
WHERE deleted_at IS NULL;
```

## 验证迁移成功

执行以下 SQL 查询来验证迁移是否成功：

```sql
-- 检查字段是否存在
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'payment_method';

-- 测试支付方式查询
SELECT * FROM get_payment_methods_with_stats();
```

## 回滚方案

如果需要回滚此迁移：

```sql
-- 删除索引
DROP INDEX IF EXISTS idx_transactions_payment_method;

-- 删除函数
DROP FUNCTION IF EXISTS check_payment_method_exists(TEXT);

-- 删除字段
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS payment_method;
```

## 注意事项

- ⚠️ 此迁移会自动将现有交易关联到默认支付方式
- ⚠️ 如果没有默认支付方式，现有交易的 `payment_method` 字段将为 NULL
- ⚠️ 建议在执行迁移前先备份数据库

## 相关文件

- 迁移 SQL: `supabase/migrations/add_payment_method_to_transactions.sql`
- 类型定义: `types/transaction.ts` （已更新）
- 服务层: `lib/services/paymentMethodService.ts`
- 原始表定义: `supabase/migrations/payment_methods_management.sql`
