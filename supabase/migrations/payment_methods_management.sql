-- =====================================================
-- 支付方式管理
-- 用于管理用户的支付账户和支付方式
-- =====================================================

-- 1. 创建支付方式表
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- 预留用户隔离字段
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'alipay', 'wechat', 'cash', 'other')) DEFAULT 'other',
  icon TEXT,
  color TEXT,
  last_4_digits TEXT, -- 银行卡后四位
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON public.payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods(is_default);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- 插入预设支付方式
INSERT INTO public.payment_methods (name, type, icon, color, is_default, sort_order) VALUES
  ('支付宝', 'alipay', '💳', '#1677FF', true, 1),
  ('微信支付', 'wechat', '💚', '#07C160', false, 2),
  ('现金', 'cash', '💵', '#10B981', false, 3),
  ('银行卡', 'debit_card', '🏦', '#6366F1', false, 4)
ON CONFLICT DO NOTHING;

-- 2. 获取支付方式列表（带使用统计）
CREATE OR REPLACE FUNCTION get_payment_methods_with_stats()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  type TEXT,
  icon TEXT,
  color TEXT,
  last_4_digits TEXT,
  is_default BOOLEAN,
  is_active BOOLEAN,
  sort_order INTEGER,
  usage_count BIGINT,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id,
    pm.user_id,
    pm.name,
    pm.type,
    pm.icon,
    pm.color,
    pm.last_4_digits,
    pm.is_default,
    pm.is_active,
    pm.sort_order,
    COALESCE(COUNT(t.id), 0) AS usage_count,
    MAX(t.created_at) AS last_used,
    pm.created_at,
    pm.updated_at
  FROM public.payment_methods pm
  LEFT JOIN public.transactions t
    ON t.payment_method = pm.id::TEXT
    AND t.deleted_at IS NULL
  WHERE pm.is_active = true
  GROUP BY pm.id
  ORDER BY pm.sort_order ASC, pm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 添加支付方式
CREATE OR REPLACE FUNCTION add_payment_method(
  p_name TEXT,
  p_type TEXT,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_last_4_digits TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_max_sort_order INTEGER;
  v_has_default BOOLEAN;
  v_is_default BOOLEAN;
BEGIN
  -- 获取当前最大排序号
  SELECT COALESCE(MAX(sort_order), 0) INTO v_max_sort_order
  FROM public.payment_methods
  WHERE is_active = true;

  -- 检查是否已有默认支付方式
  SELECT EXISTS(
    SELECT 1 FROM public.payment_methods
    WHERE is_default = true AND is_active = true
  ) INTO v_has_default;

  -- 如果没有默认支付方式，将新添加的设为默认
  v_is_default := NOT v_has_default;

  -- 插入新支付方式
  INSERT INTO public.payment_methods (
    name, type, icon, color, last_4_digits, is_default, sort_order
  ) VALUES (
    p_name, p_type, p_icon, p_color, p_last_4_digits, v_is_default, v_max_sort_order + 1
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 更新支付方式
CREATE OR REPLACE FUNCTION update_payment_method(
  p_id UUID,
  p_name TEXT,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_last_4_digits TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.payment_methods
  SET
    name = p_name,
    icon = COALESCE(p_icon, icon),
    color = COALESCE(p_color, color),
    last_4_digits = p_last_4_digits
  WHERE id = p_id AND is_active = true;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 删除支付方式（软删除，需要迁移交易记录）
CREATE OR REPLACE FUNCTION delete_payment_method(
  p_id UUID,
  p_migrate_to_id UUID DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_count BIGINT
) AS $$
DECLARE
  v_transaction_count BIGINT;
  v_payment_method_name TEXT;
  v_is_default BOOLEAN;
  v_has_other_methods BOOLEAN;
BEGIN
  -- 获取支付方式信息
  SELECT name, is_default INTO v_payment_method_name, v_is_default
  FROM public.payment_methods
  WHERE id = p_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '支付方式不存在或已删除', 0::BIGINT;
    RETURN;
  END IF;

  -- 检查是否有其他活跃的支付方式
  SELECT EXISTS(
    SELECT 1 FROM public.payment_methods
    WHERE id != p_id AND is_active = true
  ) INTO v_has_other_methods;

  -- 如果是默认支付方式且有其他支付方式，需要先设置其他支付方式为默认
  IF v_is_default AND v_has_other_methods THEN
    -- 将第一个非当前的支付方式设为默认
    UPDATE public.payment_methods
    SET is_default = true
    WHERE id = (
      SELECT id FROM public.payment_methods
      WHERE id != p_id AND is_active = true
      ORDER BY sort_order ASC
      LIMIT 1
    );
  END IF;

  -- 检查是否有关联的交易记录
  SELECT COUNT(*) INTO v_transaction_count
  FROM public.transactions
  WHERE payment_method = p_id::TEXT AND deleted_at IS NULL;

  -- 如果有交易记录但没有指定迁移目标，返回错误
  IF v_transaction_count > 0 AND p_migrate_to_id IS NULL THEN
    RETURN QUERY SELECT false, '该支付方式有关联的交易记录，请指定迁移目标', v_transaction_count;
    RETURN;
  END IF;

  -- 如果指定了迁移目标，执行迁移
  IF p_migrate_to_id IS NOT NULL THEN
    -- 验证迁移目标是否存在
    IF NOT EXISTS(SELECT 1 FROM public.payment_methods WHERE id = p_migrate_to_id AND is_active = true) THEN
      RETURN QUERY SELECT false, '迁移目标支付方式不存在', v_transaction_count;
      RETURN;
    END IF;

    -- 迁移交易记录
    UPDATE public.transactions
    SET payment_method = p_migrate_to_id::TEXT
    WHERE payment_method = p_id::TEXT AND deleted_at IS NULL;
  END IF;

  -- 软删除支付方式
  UPDATE public.payment_methods
  SET is_active = false
  WHERE id = p_id;

  RETURN QUERY SELECT true, '删除成功', v_transaction_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 设置默认支付方式
CREATE OR REPLACE FUNCTION set_default_payment_method(
  p_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- 取消所有其他支付方式的默认状态
  UPDATE public.payment_methods
  SET is_default = false
  WHERE is_default = true AND is_active = true;

  -- 设置指定支付方式为默认
  UPDATE public.payment_methods
  SET is_default = true
  WHERE id = p_id AND is_active = true;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 获取支付方式使用详情
CREATE OR REPLACE FUNCTION get_payment_method_usage_detail(
  p_id UUID
) RETURNS TABLE (
  total_transactions BIGINT,
  total_amount NUMERIC,
  avg_amount NUMERIC,
  last_used TIMESTAMPTZ,
  most_used_category TEXT,
  most_used_category_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH payment_transactions AS (
    SELECT t.id, t.amount, t.category, t.created_at
    FROM public.transactions t
    WHERE t.payment_method = p_id::TEXT AND t.deleted_at IS NULL
  ),
  category_usage AS (
    SELECT category, COUNT(*) as usage_count
    FROM payment_transactions
    GROUP BY category
    ORDER BY usage_count DESC
    LIMIT 1
  )
  SELECT
    COUNT(pt.id)::BIGINT as total_transactions,
    COALESCE(SUM(pt.amount), 0) as total_amount,
    COALESCE(AVG(pt.amount), 0) as avg_amount,
    MAX(pt.created_at) as last_used,
    cu.category as most_used_category,
    cu.usage_count as most_used_category_count
  FROM payment_transactions pt
  LEFT JOIN category_usage cu ON true
  GROUP BY cu.category, cu.usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注释说明
COMMENT ON TABLE public.payment_methods IS '支付方式管理表';
COMMENT ON FUNCTION get_payment_methods_with_stats() IS '获取支付方式列表（带使用统计）';
COMMENT ON FUNCTION add_payment_method(TEXT, TEXT, TEXT, TEXT, TEXT) IS '添加新的支付方式';
COMMENT ON FUNCTION update_payment_method(UUID, TEXT, TEXT, TEXT, TEXT) IS '更新支付方式信息';
COMMENT ON FUNCTION delete_payment_method(UUID, UUID) IS '删除支付方式（软删除，需迁移交易记录）';
COMMENT ON FUNCTION set_default_payment_method(UUID) IS '设置默认支付方式';
COMMENT ON FUNCTION get_payment_method_usage_detail(UUID) IS '获取支付方式使用详情';
