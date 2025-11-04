-- =====================================================
-- 月度预算管理系统
-- 支持总预算和分类预算设置、执行情况跟踪
-- =====================================================

-- 1. 创建预算表
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- 预留用户字段（目前为演示版，所有用户共用）
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  category_key TEXT, -- NULL 表示总预算，非 NULL 表示分类预算
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  alert_threshold NUMERIC(3,2) DEFAULT 0.80 CHECK (alert_threshold >= 0 AND alert_threshold <= 1), -- 预警阈值（80%）
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 唯一约束：每个月每个类别只能有一个预算
  UNIQUE (year, month, category_key)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON public.budgets (year, month);
CREATE INDEX IF NOT EXISTS idx_budgets_category_key ON public.budgets (category_key);
CREATE INDEX IF NOT EXISTS idx_budgets_is_active ON public.budgets (is_active);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budgets_updated_at_trigger
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- 2. 设置或更新预算
CREATE OR REPLACE FUNCTION set_budget(
  p_year INTEGER,
  p_month INTEGER,
  p_category_key TEXT, -- NULL 表示总预算
  p_amount NUMERIC,
  p_alert_threshold NUMERIC DEFAULT 0.80
)
RETURNS UUID AS $$
DECLARE
  budget_id UUID;
BEGIN
  -- 插入或更新
  INSERT INTO public.budgets (year, month, category_key, amount, alert_threshold)
  VALUES (p_year, p_month, p_category_key, p_amount, p_alert_threshold)
  ON CONFLICT (year, month, category_key)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    alert_threshold = EXCLUDED.alert_threshold,
    is_active = true
  RETURNING id INTO budget_id;

  RETURN budget_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 获取本月预算执行情况
CREATE OR REPLACE FUNCTION get_monthly_budget_status(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  id UUID,
  category_key TEXT,
  category_label TEXT,
  category_icon TEXT,
  category_color TEXT,
  budget_amount NUMERIC,
  spent_amount NUMERIC,
  remaining_amount NUMERIC,
  usage_percentage NUMERIC,
  alert_threshold NUMERIC,
  is_over_budget BOOLEAN,
  is_near_limit BOOLEAN,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH budget_data AS (
    SELECT
      b.id,
      b.category_key,
      b.amount as budget_amount,
      b.alert_threshold
    FROM public.budgets b
    WHERE b.year = p_year
      AND b.month = p_month
      AND b.is_active = true
  ),
  spending_data AS (
    SELECT
      t.category,
      COALESCE(SUM(t.amount), 0) as spent_amount,
      COUNT(t.id) as transaction_count
    FROM public.transactions t
    WHERE t.type = 'expense'
      AND t.deleted_at IS NULL
      AND EXTRACT(YEAR FROM t.date) = p_year
      AND EXTRACT(MONTH FROM t.date) = p_month
    GROUP BY t.category
  )
  SELECT
    bd.id,
    bd.category_key,
    COALESCE(c.label, '总预算') as category_label,
    c.icon as category_icon,
    c.color as category_color,
    bd.budget_amount,
    COALESCE(sd.spent_amount, 0) as spent_amount,
    bd.budget_amount - COALESCE(sd.spent_amount, 0) as remaining_amount,
    CASE
      WHEN bd.budget_amount > 0 THEN
        ROUND((COALESCE(sd.spent_amount, 0) / bd.budget_amount) * 100, 2)
      ELSE 0
    END as usage_percentage,
    bd.alert_threshold,
    (COALESCE(sd.spent_amount, 0) > bd.budget_amount) as is_over_budget,
    (COALESCE(sd.spent_amount, 0) >= bd.budget_amount * bd.alert_threshold) as is_near_limit,
    COALESCE(sd.transaction_count, 0) as transaction_count
  FROM budget_data bd
  LEFT JOIN public.categories c ON c.key = bd.category_key
  LEFT JOIN spending_data sd ON sd.category = bd.category_key
  ORDER BY
    CASE WHEN bd.category_key IS NULL THEN 0 ELSE 1 END, -- 总预算排在最前
    usage_percentage DESC; -- 按使用率降序
END;
$$ LANGUAGE plpgsql;

-- 4. 获取总预算汇总
CREATE OR REPLACE FUNCTION get_total_budget_summary(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  total_budget NUMERIC,
  total_spent NUMERIC,
  total_remaining NUMERIC,
  usage_percentage NUMERIC,
  category_budgets_count INTEGER,
  over_budget_count INTEGER,
  near_limit_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT * FROM get_monthly_budget_status(p_year, p_month)
  )
  SELECT
    -- 如果有总预算就用总预算，否则用分类预算之和
    COALESCE(
      (SELECT budget_amount FROM stats WHERE category_key IS NULL),
      (SELECT SUM(budget_amount) FROM stats WHERE category_key IS NOT NULL)
    ) as total_budget,
    (SELECT SUM(spent_amount) FROM stats WHERE category_key IS NOT NULL) as total_spent,
    COALESCE(
      (SELECT remaining_amount FROM stats WHERE category_key IS NULL),
      (SELECT SUM(budget_amount) - SUM(spent_amount) FROM stats WHERE category_key IS NOT NULL)
    ) as total_remaining,
    CASE
      WHEN COALESCE(
        (SELECT budget_amount FROM stats WHERE category_key IS NULL),
        (SELECT SUM(budget_amount) FROM stats WHERE category_key IS NOT NULL)
      ) > 0 THEN
        ROUND(
          (SELECT SUM(spent_amount) FROM stats WHERE category_key IS NOT NULL) /
          COALESCE(
            (SELECT budget_amount FROM stats WHERE category_key IS NULL),
            (SELECT SUM(budget_amount) FROM stats WHERE category_key IS NOT NULL)
          ) * 100,
          2
        )
      ELSE 0
    END as usage_percentage,
    (SELECT COUNT(*)::INTEGER FROM stats WHERE category_key IS NOT NULL) as category_budgets_count,
    (SELECT COUNT(*)::INTEGER FROM stats WHERE category_key IS NOT NULL AND is_over_budget = true) as over_budget_count,
    (SELECT COUNT(*)::INTEGER FROM stats WHERE category_key IS NOT NULL AND is_near_limit = true) as near_limit_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 删除预算
CREATE OR REPLACE FUNCTION delete_budget(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.budgets SET is_active = false WHERE id = p_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. 获取历史预算数据（用于趋势分析）
CREATE OR REPLACE FUNCTION get_budget_history(
  p_category_key TEXT DEFAULT NULL,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  year INTEGER,
  month INTEGER,
  budget_amount NUMERIC,
  spent_amount NUMERIC,
  usage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH month_range AS (
    SELECT DISTINCT
      EXTRACT(YEAR FROM t.date)::INTEGER as year,
      EXTRACT(MONTH FROM t.date)::INTEGER as month
    FROM public.transactions t
    WHERE t.type = 'expense'
      AND t.deleted_at IS NULL
      AND t.date >= (CURRENT_DATE - INTERVAL '1 month' * p_months)
    ORDER BY year DESC, month DESC
    LIMIT p_months
  )
  SELECT
    mr.year,
    mr.month,
    COALESCE(b.amount, 0) as budget_amount,
    COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.type = 'expense'
        AND t.deleted_at IS NULL
        AND EXTRACT(YEAR FROM t.date) = mr.year
        AND EXTRACT(MONTH FROM t.date) = mr.month
        AND (p_category_key IS NULL OR t.category = p_category_key)
    ), 0) as spent_amount,
    CASE
      WHEN COALESCE(b.amount, 0) > 0 THEN
        ROUND((
          COALESCE((
            SELECT SUM(t.amount)
            FROM public.transactions t
            WHERE t.type = 'expense'
              AND t.deleted_at IS NULL
              AND EXTRACT(YEAR FROM t.date) = mr.year
              AND EXTRACT(MONTH FROM t.date) = mr.month
              AND (p_category_key IS NULL OR t.category = p_category_key)
          ), 0) / b.amount
        ) * 100, 2)
      ELSE 0
    END as usage_percentage
  FROM month_range mr
  LEFT JOIN public.budgets b
    ON b.year = mr.year
    AND b.month = mr.month
    AND (b.category_key = p_category_key OR (b.category_key IS NULL AND p_category_key IS NULL))
    AND b.is_active = true
  ORDER BY mr.year DESC, mr.month DESC;
END;
$$ LANGUAGE plpgsql;

-- 注释
COMMENT ON TABLE public.budgets IS '月度预算表，支持总预算和分类预算';
COMMENT ON FUNCTION set_budget(INTEGER, INTEGER, TEXT, NUMERIC, NUMERIC) IS '设置或更新预算';
COMMENT ON FUNCTION get_monthly_budget_status(INTEGER, INTEGER) IS '获取本月预算执行情况';
COMMENT ON FUNCTION get_total_budget_summary(INTEGER, INTEGER) IS '获取总预算汇总';
COMMENT ON FUNCTION delete_budget(UUID) IS '删除预算（软删除）';
COMMENT ON FUNCTION get_budget_history(TEXT, INTEGER) IS '获取历史预算数据（用于趋势分析）';
