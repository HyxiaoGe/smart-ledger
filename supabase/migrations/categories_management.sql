-- =====================================================
-- 类别管理系统
-- 支持系统预设类别和用户自定义类别
-- =====================================================

-- 1. 创建类别表
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- 类别键（如 food, transport）
  label TEXT NOT NULL, -- 显示名称（如 吃饭、交通）
  icon TEXT, -- 图标（Emoji 或图标名称）
  color TEXT, -- 颜色（十六进制）
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')) DEFAULT 'expense',
  is_system BOOLEAN NOT NULL DEFAULT false, -- 是否为系统预设类别
  is_active BOOLEAN NOT NULL DEFAULT true, -- 是否启用
  sort_order INTEGER DEFAULT 0, -- 排序顺序
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_categories_key ON public.categories (key);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories (type);
CREATE INDEX IF NOT EXISTS idx_categories_is_system ON public.categories (is_system);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories (is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories (sort_order);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at_trigger
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- 2. 插入系统预设类别
INSERT INTO public.categories (key, label, icon, color, type, is_system, sort_order)
VALUES
  ('food', '吃饭', '🍜', '#F97316', 'expense', true, 1),
  ('drink', '饮料', '🥤', '#22C55E', 'expense', true, 2),
  ('transport', '交通', '🚌', '#06B6D4', 'expense', true, 3),
  ('entertainment', '娱乐', '🎮', '#A855F7', 'expense', true, 4),
  ('rent', '房租', '🏠', '#3B82F6', 'expense', true, 5),
  ('utilities', '水电', '💡', '#0EA5E9', 'expense', true, 6),
  ('daily', '日常开销', '🧺', '#F59E0B', 'expense', true, 7),
  ('subscription', '订阅', '📦', '#EF4444', 'expense', true, 8),
  ('other', '其他', '📁', '#6B7280', 'expense', true, 9)
ON CONFLICT (key) DO NOTHING;

-- 3. 获取所有类别（包含使用统计）
CREATE OR REPLACE FUNCTION get_categories_with_stats()
RETURNS TABLE (
  id UUID,
  key TEXT,
  label TEXT,
  icon TEXT,
  color TEXT,
  type TEXT,
  is_system BOOLEAN,
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
    c.id,
    c.key,
    c.label,
    c.icon,
    c.color,
    c.type,
    c.is_system,
    c.is_active,
    c.sort_order,
    COALESCE(COUNT(t.id), 0) AS usage_count,
    MAX(t.created_at) AS last_used,
    c.created_at,
    c.updated_at
  FROM public.categories c
  LEFT JOIN public.transactions t ON t.category = c.key AND t.deleted_at IS NULL
  WHERE c.is_active = true
  GROUP BY c.id
  ORDER BY c.sort_order ASC, c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. 添加自定义类别
CREATE OR REPLACE FUNCTION add_custom_category(
  p_key TEXT,
  p_label TEXT,
  p_icon TEXT DEFAULT '📁',
  p_color TEXT DEFAULT '#6B7280',
  p_type TEXT DEFAULT 'expense'
)
RETURNS UUID AS $$
DECLARE
  new_category_id UUID;
  max_sort_order INTEGER;
BEGIN
  -- 检查 key 是否已存在
  IF EXISTS (SELECT 1 FROM public.categories WHERE key = p_key) THEN
    RAISE EXCEPTION '类别键 "%" 已存在', p_key;
  END IF;

  -- 获取当前最大排序值
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO max_sort_order FROM public.categories;

  -- 插入新类别
  INSERT INTO public.categories (key, label, icon, color, type, is_system, is_active, sort_order)
  VALUES (p_key, p_label, p_icon, p_color, p_type, false, true, max_sort_order)
  RETURNING id INTO new_category_id;

  RETURN new_category_id;
END;
$$ LANGUAGE plpgsql;

-- 5. 更新类别
CREATE OR REPLACE FUNCTION update_category(
  p_id UUID,
  p_label TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  category_is_system BOOLEAN;
BEGIN
  -- 检查类别是否存在
  SELECT is_system INTO category_is_system FROM public.categories WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '类别不存在';
  END IF;

  -- 系统类别只能修改 label，不能修改其他属性
  IF category_is_system THEN
    IF p_label IS NOT NULL THEN
      UPDATE public.categories SET label = p_label WHERE id = p_id;
    END IF;
  ELSE
    -- 自定义类别可以修改所有属性
    UPDATE public.categories
    SET
      label = COALESCE(p_label, label),
      icon = COALESCE(p_icon, icon),
      color = COALESCE(p_color, color),
      is_active = COALESCE(p_is_active, is_active),
      sort_order = COALESCE(p_sort_order, sort_order)
    WHERE id = p_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. 删除类别（软删除，实际是禁用）
CREATE OR REPLACE FUNCTION delete_category(
  p_id UUID,
  p_migrate_to_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  affected_transactions BIGINT
) AS $$
DECLARE
  category_key TEXT;
  category_is_system BOOLEAN;
  transaction_count BIGINT;
BEGIN
  -- 获取类别信息
  SELECT key, is_system INTO category_key, category_is_system
  FROM public.categories WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '类别不存在'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- 系统类别不能删除
  IF category_is_system THEN
    RETURN QUERY SELECT false, '系统类别不能删除'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- 检查是否有交易使用该类别
  SELECT COUNT(*) INTO transaction_count
  FROM public.transactions
  WHERE category = category_key AND deleted_at IS NULL;

  -- 如果有交易且未指定迁移目标，返回错误
  IF transaction_count > 0 AND p_migrate_to_key IS NULL THEN
    RETURN QUERY SELECT
      false,
      FORMAT('该类别有 %s 笔交易记录，请指定迁移到的类别', transaction_count),
      transaction_count;
    RETURN;
  END IF;

  -- 如果指定了迁移目标，迁移交易
  IF p_migrate_to_key IS NOT NULL AND transaction_count > 0 THEN
    -- 检查目标类别是否存在
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE key = p_migrate_to_key AND is_active = true) THEN
      RETURN QUERY SELECT false, '目标类别不存在或已禁用'::TEXT, 0::BIGINT;
      RETURN;
    END IF;

    -- 迁移交易
    UPDATE public.transactions
    SET category = p_migrate_to_key
    WHERE category = category_key AND deleted_at IS NULL;
  END IF;

  -- 禁用类别
  UPDATE public.categories SET is_active = false WHERE id = p_id;

  RETURN QUERY SELECT true, '类别已删除'::TEXT, transaction_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 获取类别使用统计详情
CREATE OR REPLACE FUNCTION get_category_usage_detail(p_key TEXT)
RETURNS TABLE (
  total_transactions BIGINT,
  total_amount NUMERIC,
  avg_amount NUMERIC,
  first_used TIMESTAMPTZ,
  last_used TIMESTAMPTZ,
  this_month_count BIGINT,
  this_month_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_transactions,
    COALESCE(SUM(amount), 0) AS total_amount,
    COALESCE(AVG(amount), 0) AS avg_amount,
    MIN(created_at) AS first_used,
    MAX(created_at) AS last_used,
    COUNT(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::BIGINT AS this_month_count,
    COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS this_month_amount
  FROM public.transactions
  WHERE category = p_key AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 注释
COMMENT ON TABLE public.categories IS '消费类别表，支持系统预设和用户自定义';
COMMENT ON FUNCTION get_categories_with_stats() IS '获取所有类别及使用统计';
COMMENT ON FUNCTION add_custom_category(TEXT, TEXT, TEXT, TEXT, TEXT) IS '添加自定义类别';
COMMENT ON FUNCTION update_category(UUID, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) IS '更新类别信息';
COMMENT ON FUNCTION delete_category(UUID, TEXT) IS '删除类别（需要迁移现有交易）';
COMMENT ON FUNCTION get_category_usage_detail(TEXT) IS '获取类别使用详情统计';
