-- ============================================
-- 动态预算建议系统
-- 功能：基于历史消费数据自动生成预算建议
-- 更新频率：每天凌晨 2:00
-- ============================================

-- 1. 创建预算建议表
CREATE TABLE IF NOT EXISTS budget_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_key VARCHAR(50),
  year INT NOT NULL,
  month INT NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',

  -- 建议数据
  suggested_amount NUMERIC(10, 2) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
  reason TEXT NOT NULL,

  -- 计算依据
  historical_avg NUMERIC(10, 2),          -- 历史平均支出
  historical_months INT,                   -- 参考了几个月的历史
  current_month_spending NUMERIC(10, 2),  -- 当前月已支出
  current_daily_rate NUMERIC(10, 2),      -- 当前日均支出
  predicted_month_total NUMERIC(10, 2),   -- 预测月底总支出
  trend_direction VARCHAR(20),             -- 'up', 'stable', 'down'

  -- 元数据
  calculated_at TIMESTAMP DEFAULT NOW(),
  days_into_month INT,                     -- 月份第几天
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_budget_suggestions_active
  ON budget_suggestions(year, month, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_budget_suggestions_category
  ON budget_suggestions(category_key, year, month);

-- 2. 计算某分类的历史平均支出
CREATE OR REPLACE FUNCTION calculate_category_avg_spending(
  p_category_key VARCHAR,
  p_months INT DEFAULT 3,
  p_currency VARCHAR DEFAULT 'CNY'
) RETURNS TABLE (
  avg_spending NUMERIC,
  months_count INT,
  trend VARCHAR
) AS $$
DECLARE
  v_data RECORD;
  v_first_month NUMERIC;
  v_last_month NUMERIC;
BEGIN
  -- 查询过去N个月的月均支出
  WITH monthly_spending AS (
    SELECT
      EXTRACT(YEAR FROM date)::INT as year,
      EXTRACT(MONTH FROM date)::INT as month,
      SUM(amount) as total
    FROM transactions
    WHERE
      category = p_category_key
      AND type = 'expense'
      AND deleted_at IS NULL
      AND currency = p_currency
      AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * p_months)
      AND date < DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY year, month
    ORDER BY year, month
  )
  SELECT
    COALESCE(AVG(total), 0) as avg_val,
    COUNT(*)::INT as cnt,
    CASE
      WHEN COUNT(*) >= 2 THEN
        (SELECT total FROM monthly_spending ORDER BY year DESC, month DESC LIMIT 1)
      ELSE 0
    END as last,
    CASE
      WHEN COUNT(*) >= 2 THEN
        (SELECT total FROM monthly_spending ORDER BY year, month LIMIT 1)
      ELSE 0
    END as first
  INTO v_data
  FROM monthly_spending;

  -- 判断趋势
  IF v_data.cnt < 2 THEN
    RETURN QUERY SELECT
      v_data.avg_val,
      v_data.cnt,
      'unknown'::VARCHAR;
  ELSIF v_data.last > v_data.first * 1.15 THEN
    RETURN QUERY SELECT
      v_data.avg_val,
      v_data.cnt,
      'up'::VARCHAR;
  ELSIF v_data.last < v_data.first * 0.85 THEN
    RETURN QUERY SELECT
      v_data.avg_val,
      v_data.cnt,
      'down'::VARCHAR;
  ELSE
    RETURN QUERY SELECT
      v_data.avg_val,
      v_data.cnt,
      'stable'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. 预测当前月月底支出
CREATE OR REPLACE FUNCTION predict_month_end_spending(
  p_category_key VARCHAR,
  p_year INT,
  p_month INT,
  p_currency VARCHAR DEFAULT 'CNY'
) RETURNS TABLE (
  current_spending NUMERIC,
  daily_rate NUMERIC,
  predicted_total NUMERIC,
  days_passed INT,
  days_remaining INT
) AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_today DATE;
  v_days_passed INT;
  v_days_remaining INT;
  v_total_days INT;
  v_current_spending NUMERIC;
  v_daily_rate NUMERIC;
  v_predicted NUMERIC;
BEGIN
  v_month_start := DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1));
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  v_today := CURRENT_DATE;

  -- 如果是未来月份，返回 NULL
  IF v_month_start > v_today THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0, 0;
    RETURN;
  END IF;

  -- 计算天数
  v_days_passed := LEAST(v_today - v_month_start + 1, EXTRACT(DAY FROM v_month_end)::INT);
  v_total_days := EXTRACT(DAY FROM v_month_end)::INT;
  v_days_remaining := GREATEST(v_total_days - v_days_passed, 0);

  -- 查询当前月已支出
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_spending
  FROM transactions
  WHERE
    category = p_category_key
    AND type = 'expense'
    AND deleted_at IS NULL
    AND currency = p_currency
    AND date >= v_month_start
    AND date <= v_today;

  -- 计算日均支出
  IF v_days_passed > 0 THEN
    v_daily_rate := v_current_spending / v_days_passed;
  ELSE
    v_daily_rate := 0;
  END IF;

  -- 预测月底总支出
  v_predicted := v_current_spending + (v_daily_rate * v_days_remaining);

  RETURN QUERY SELECT
    v_current_spending,
    v_daily_rate,
    v_predicted,
    v_days_passed,
    v_days_remaining;
END;
$$ LANGUAGE plpgsql;

-- 4. 生成动态预算建议（主函数）
CREATE OR REPLACE FUNCTION generate_budget_suggestion(
  p_category_key VARCHAR,
  p_year INT,
  p_month INT,
  p_currency VARCHAR DEFAULT 'CNY'
) RETURNS TABLE (
  suggested_amount NUMERIC,
  confidence_level VARCHAR,
  reason TEXT,
  historical_avg NUMERIC,
  historical_months INT,
  current_spending NUMERIC,
  daily_rate NUMERIC,
  predicted_total NUMERIC,
  trend VARCHAR,
  days_into_month INT
) AS $$
DECLARE
  v_hist RECORD;
  v_pred RECORD;
  v_suggested NUMERIC;
  v_confidence VARCHAR;
  v_reason TEXT;
  v_days_into_month INT;
BEGIN
  -- 获取历史数据
  SELECT * INTO v_hist FROM calculate_category_avg_spending(p_category_key, 3, p_currency);

  -- 获取当前月预测
  SELECT * INTO v_pred FROM predict_month_end_spending(p_category_key, p_year, p_month, p_currency);

  -- 计算当前是本月第几天
  v_days_into_month := EXTRACT(DAY FROM CURRENT_DATE)::INT;

  -- 生成建议逻辑
  IF v_hist.months_count = 0 THEN
    -- 情况1: 没有历史数据
    v_suggested := 1000; -- 默认建议
    v_confidence := 'low';
    v_reason := '暂无历史数据，建议从 ¥1000 开始，后续根据实际支出调整';

  ELSIF v_hist.months_count = 1 THEN
    -- 情况2: 只有1个月历史
    IF v_days_into_month <= 10 THEN
      -- 月初：使用上月 × 1.1
      v_suggested := v_hist.avg_spending * 1.1;
      v_confidence := 'low';
      v_reason := '上月支出 **¥' || ROUND(v_hist.avg_spending, 0) || '**，建议略高以留余地';
    ELSE
      -- 月中/月末：结合预测
      v_suggested := GREATEST(v_hist.avg_spending * 1.1, v_pred.predicted_total * 1.05);
      v_confidence := 'low';
      v_reason := '综合上月支出和当前消费速度';
    END IF;

  ELSE
    -- 情况3: 有2个月以上历史
    IF v_days_into_month <= 10 THEN
      -- 月初：使用历史平均
      v_suggested := v_hist.avg_spending * 1.05;
      v_confidence := 'medium';
      v_reason := '过去 ' || v_hist.months_count || ' 个月平均支出 **¥' || ROUND(v_hist.avg_spending, 0) || '**';

    ELSIF v_days_into_month <= 20 THEN
      -- 月中：开始考虑当前速度
      IF v_pred.predicted_total > v_hist.avg_spending * 1.2 THEN
        v_suggested := v_pred.predicted_total * 1.1;
        v_confidence := 'medium';
        v_reason := '⚠️ 当前消费速度较快，预测月底 **¥' || ROUND(v_pred.predicted_total, 0) || '**，建议控制';
      ELSE
        v_suggested := v_hist.avg_spending * 1.05;
        v_confidence := 'medium';
        v_reason := '消费速度正常，保持历史平均水平';
      END IF;

    ELSE
      -- 月末：以预测为准
      v_suggested := GREATEST(v_pred.predicted_total, v_pred.current_spending);
      v_confidence := 'high';
      v_reason := '本月实际支出 **¥' || ROUND(v_pred.current_spending, 0) || '**，动态调整';
    END IF;
  END IF;

  -- 确保建议值不小于当前已花费
  IF v_pred.current_spending > v_suggested THEN
    v_suggested := v_pred.current_spending * 1.05;
    v_reason := v_reason || '（已调整为当前支出 + 5%）';
  END IF;

  RETURN QUERY SELECT
    ROUND(v_suggested, 2),
    v_confidence,
    v_reason,
    ROUND(v_hist.avg_spending, 2),
    v_hist.months_count,
    ROUND(v_pred.current_spending, 2),
    ROUND(v_pred.daily_rate, 2),
    ROUND(v_pred.predicted_total, 2),
    v_hist.trend,
    v_days_into_month;
END;
$$ LANGUAGE plpgsql;

-- 5. 批量生成所有活跃分类的预算建议
CREATE OR REPLACE FUNCTION refresh_all_budget_suggestions(
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT
) RETURNS INT AS $$
DECLARE
  v_category RECORD;
  v_count INT := 0;
BEGIN
  -- 标记旧建议为非活跃
  UPDATE budget_suggestions
  SET is_active = false
  WHERE year = p_year AND month = p_month;

  -- 为每个活跃分类生成建议（排除固定支出）
  FOR v_category IN
    SELECT DISTINCT category as key
    FROM transactions
    WHERE type = 'expense' AND deleted_at IS NULL
      AND category NOT IN (
        SELECT DISTINCT category FROM fixed_expenses WHERE is_active = true
      )
    UNION
    SELECT DISTINCT category_key as key
    FROM budgets
    WHERE is_active = true
      AND category_key NOT IN (
        SELECT DISTINCT category FROM fixed_expenses WHERE is_active = true
      )
  LOOP
    INSERT INTO budget_suggestions (
      category_key, year, month, currency,
      suggested_amount, confidence_level, reason,
      historical_avg, historical_months,
      current_month_spending, current_daily_rate,
      predicted_month_total, trend_direction,
      days_into_month, is_active
    )
    SELECT
      v_category.key,
      p_year,
      p_month,
      'CNY',
      suggested_amount,
      confidence_level,
      reason,
      historical_avg,
      historical_months,
      current_spending,
      daily_rate,
      predicted_total,
      trend,
      days_into_month,
      true
    FROM generate_budget_suggestion(v_category.key, p_year, p_month, 'CNY');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建定时任务（每天凌晨 2:00 执行）
SELECT cron.schedule(
  'refresh-budget-suggestions-daily',
  '0 2 * * *',
  $$
  SELECT refresh_all_budget_suggestions(
    EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT
  );
  $$
);

-- 7. 查询当前活跃的预算建议（前端使用）
COMMENT ON TABLE budget_suggestions IS '动态预算建议表 - 每天自动更新';
COMMENT ON FUNCTION refresh_all_budget_suggestions IS '刷新所有分类的预算建议';
COMMENT ON FUNCTION generate_budget_suggestion IS '为单个分类生成预算建议';

-- 8. 手动执行一次（可选）
-- SELECT refresh_all_budget_suggestions();
