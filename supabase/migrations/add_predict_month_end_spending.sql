-- 添加预测月底支出的函数
-- 功能：根据当前消费速率预测本月底某类别会花多少钱
-- 用途：提前预警，避免月底超预算

CREATE OR REPLACE FUNCTION predict_month_end_spending(
  p_category_key text,
  p_year integer,
  p_month integer,
  p_currency text DEFAULT 'CNY'
)
RETURNS TABLE(
  current_spending numeric,
  daily_rate numeric,
  predicted_total numeric,
  days_passed integer,
  days_remaining integer
) AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_today date;
  v_days_in_month integer;
  v_days_passed integer;
  v_days_remaining integer;
  v_current_spending numeric;
  v_daily_rate numeric;
  v_predicted_total numeric;
BEGIN
  -- 计算当月的开始和结束日期
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month')::date;
  v_today := CURRENT_DATE;

  -- 如果查询的不是当前月份，返回空
  IF v_today < v_start_date OR v_today >= v_end_date THEN
    RETURN;
  END IF;

  -- 计算天数
  v_days_in_month := EXTRACT(DAY FROM (v_end_date - interval '1 day')::date);
  v_days_passed := EXTRACT(DAY FROM v_today) - 1; -- 不包括今天
  v_days_remaining := v_days_in_month - EXTRACT(DAY FROM v_today) + 1; -- 包括今天

  -- 如果还没有过去任何天数，返回空
  IF v_days_passed <= 0 THEN
    RETURN;
  END IF;

  -- 查询当前已花费金额
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_spending
  FROM transactions
  WHERE category = p_category_key
    AND currency = p_currency
    AND type = 'expense'
    AND deleted_at IS NULL
    AND date >= v_start_date
    AND date < v_today;

  -- 计算每日平均花费
  v_daily_rate := v_current_spending / v_days_passed;

  -- 预测月底总花费 = 当前花费 + (剩余天数 * 每日平均)
  v_predicted_total := v_current_spending + (v_daily_rate * v_days_remaining);

  -- 返回结果
  RETURN QUERY SELECT
    v_current_spending,
    v_daily_rate,
    v_predicted_total,
    v_days_passed,
    v_days_remaining;
END;
$$ LANGUAGE plpgsql;

-- 测试函数（可选，执行后删除此注释）
-- SELECT * FROM predict_month_end_spending('food', 2025, 11, 'CNY');
