-- =====================================================
-- 为 transactions 表添加 payment_method 字段
-- 修复支付方式管理功能的数据库结构问题
-- =====================================================

-- 1. 添加 payment_method 字段到 transactions 表
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. 添加注释
COMMENT ON COLUMN public.transactions.payment_method IS '支付方式 ID，关联到 payment_methods 表';

-- 3. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
ON public.transactions(payment_method)
WHERE deleted_at IS NULL;

-- 4. 可选：如果有默认支付方式，可以为现有记录设置默认值
-- 注意：此步骤会将所有现有的交易记录关联到默认支付方式
DO $$
DECLARE
  default_payment_method_id UUID;
BEGIN
  -- 获取默认支付方式的 ID
  SELECT id INTO default_payment_method_id
  FROM public.payment_methods
  WHERE is_default = true AND is_active = true
  LIMIT 1;

  -- 如果有默认支付方式，更新所有没有支付方式的交易记录
  IF default_payment_method_id IS NOT NULL THEN
    UPDATE public.transactions
    SET payment_method = default_payment_method_id::TEXT
    WHERE payment_method IS NULL;

    RAISE NOTICE '已将现有交易记录关联到默认支付方式: %', default_payment_method_id;
  ELSE
    RAISE NOTICE '未找到默认支付方式，跳过更新现有交易记录';
  END IF;
END $$;

-- 5. 创建外键约束（可选，但建议添加以保证数据完整性）
-- 注意：由于 payment_method 存储的是 TEXT 类型的 UUID，而不是直接的 UUID 外键
-- 我们使用一个检查约束来确保引用的支付方式存在
-- 如果需要更严格的约束，可以考虑将字段类型改为 UUID 并添加真正的外键

-- 添加检查函数
CREATE OR REPLACE FUNCTION check_payment_method_exists(payment_method_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF payment_method_text IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS(
    SELECT 1
    FROM public.payment_methods
    WHERE id::TEXT = payment_method_text
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- 添加检查约束（可选，如果不想约束可以注释掉）
-- ALTER TABLE public.transactions
-- ADD CONSTRAINT check_valid_payment_method
-- CHECK (check_payment_method_exists(payment_method));

COMMENT ON FUNCTION check_payment_method_exists(TEXT) IS '检查支付方式是否存在且活跃';
