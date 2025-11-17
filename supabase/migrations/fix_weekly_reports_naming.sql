-- ========================================
-- 修复周报功能的命名不匹配问题
-- ========================================
-- 问题：前端使用 weekly_reports，数据库使用 weekly_consumption_reports
-- 解决：统一到 weekly_reports 命名

-- 1. 如果 weekly_consumption_reports 表存在，重命名为 weekly_reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_consumption_reports') THEN
    -- 如果 weekly_reports 也存在，先删除（谨慎操作）
    DROP TABLE IF EXISTS weekly_reports CASCADE;

    -- 重命名表
    ALTER TABLE weekly_consumption_reports RENAME TO weekly_reports;

    -- 重命名字段以匹配前端期望
    ALTER TABLE weekly_reports RENAME COLUMN payment_method_breakdown TO payment_method_stats;
    ALTER TABLE weekly_reports RENAME COLUMN ai_summary TO ai_insights;

    RAISE NOTICE '✅ 表 weekly_consumption_reports 已重命名为 weekly_reports';
    RAISE NOTICE '✅ 字段已更新: payment_method_breakdown → payment_method_stats';
    RAISE NOTICE '✅ 字段已更新: ai_summary → ai_insights';
  ELSE
    RAISE NOTICE '⚠️ 表 weekly_consumption_reports 不存在，请先创建';
  END IF;
END $$;

-- 2. 创建或替换函数：generate_weekly_report (匹配前端调用)
CREATE OR REPLACE FUNCTION generate_weekly_report()
RETURNS TABLE(
  report_id BIGINT,
  week_start DATE,
  week_end DATE,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_total_expenses DECIMAL(10, 2);
  v_transaction_count INTEGER;
  v_category_breakdown JSONB;
  v_top_merchants JSONB;
  v_payment_stats JSONB;
  v_prev_week_total DECIMAL(10, 2);
  v_wow_change DECIMAL(10, 2);
  v_wow_percentage DECIMAL(5, 2);
  v_report_id BIGINT;
BEGIN
  -- 计算上周的起止日期（周一到周日）
  v_week_end := CURRENT_DATE - INTERVAL '1 day' - (EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '1 day')::INTEGER) * INTERVAL '1 day';
  v_week_start := v_week_end - INTERVAL '6 days';

  -- 检查是否已经生成过该周报告
  IF EXISTS (SELECT 1 FROM weekly_reports WHERE week_start_date = v_week_start) THEN
    RETURN QUERY SELECT
      id,
      week_start_date,
      week_end_date,
      '报告已存在，跳过生成'::TEXT
    FROM weekly_reports
    WHERE week_start_date = v_week_start;
    RETURN;
  END IF;

  -- 统计总支出和交易数
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_total_expenses, v_transaction_count
  FROM transactions
  WHERE type = 'expense'
    AND deleted_at IS NULL
    AND date >= v_week_start
    AND date <= v_week_end;

  -- 统计分类支出
  SELECT COALESCE(jsonb_agg(category_stats), '[]'::jsonb)
  INTO v_category_breakdown
  FROM (
    SELECT jsonb_build_object(
      'category', category,
      'amount', SUM(amount),
      'count', COUNT(*),
      'percentage', ROUND((SUM(amount) / NULLIF(v_total_expenses, 0) * 100)::numeric, 2)
    ) AS category_stats
    FROM transactions
    WHERE type = 'expense'
      AND deleted_at IS NULL
      AND date >= v_week_start
      AND date <= v_week_end
    GROUP BY category
    ORDER BY SUM(amount) DESC
  ) sub;

  -- 统计 TOP 5 商家
  SELECT COALESCE(jsonb_agg(merchant_stats), '[]'::jsonb)
  INTO v_top_merchants
  FROM (
    SELECT jsonb_build_object(
      'merchant', merchant,
      'amount', SUM(amount),
      'count', COUNT(*)
    ) AS merchant_stats
    FROM transactions
    WHERE type = 'expense'
      AND deleted_at IS NULL
      AND merchant IS NOT NULL
      AND merchant != ''
      AND date >= v_week_start
      AND date <= v_week_end
    GROUP BY merchant
    ORDER BY SUM(amount) DESC
    LIMIT 5
  ) sub;

  -- 统计支付方式 (注意：键名使用 'method' 而不是 'payment_method')
  SELECT COALESCE(jsonb_agg(payment_stats), '[]'::jsonb)
  INTO v_payment_stats
  FROM (
    SELECT jsonb_build_object(
      'method', COALESCE(payment_method, '未指定'),
      'amount', SUM(amount),
      'count', COUNT(*),
      'percentage', ROUND((SUM(amount) / NULLIF(v_total_expenses, 0) * 100)::numeric, 2)
    ) AS payment_stats
    FROM transactions
    WHERE type = 'expense'
      AND deleted_at IS NULL
      AND date >= v_week_start
      AND date <= v_week_end
    GROUP BY payment_method
    ORDER BY SUM(amount) DESC
  ) sub;

  -- 计算环比增长
  SELECT COALESCE(SUM(amount), 0)
  INTO v_prev_week_total
  FROM transactions
  WHERE type = 'expense'
    AND deleted_at IS NULL
    AND date >= (v_week_start - INTERVAL '7 days')
    AND date <= (v_week_end - INTERVAL '7 days');

  v_wow_change := v_total_expenses - v_prev_week_total;
  v_wow_percentage := CASE
    WHEN v_prev_week_total > 0 THEN ROUND(((v_total_expenses - v_prev_week_total) / v_prev_week_total * 100)::numeric, 2)
    ELSE 0
  END;

  -- 插入报告 (注意字段名匹配)
  INSERT INTO weekly_reports (
    week_start_date,
    week_end_date,
    total_expenses,
    transaction_count,
    category_breakdown,
    top_merchants,
    payment_method_stats,  -- 使用正确的字段名
    week_over_week_change,
    week_over_week_percentage,
    ai_insights  -- 使用正确的字段名
  ) VALUES (
    v_week_start,
    v_week_end,
    v_total_expenses,
    v_transaction_count,
    v_category_breakdown,
    v_top_merchants,
    v_payment_stats,
    v_wow_change,
    v_wow_percentage,
    '本周消费报告已生成，等待 AI 分析...'
  )
  RETURNING id INTO v_report_id;

  RETURN QUERY SELECT
    v_report_id,
    v_week_start,
    v_week_end,
    format('成功生成报告 #%s，总支出 ¥%s', v_report_id, v_total_expenses)::TEXT;
END;
$$;

-- 3. 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS generate_weekly_consumption_report();

-- 4. 启用 RLS
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- 5. 创建访问策略（先删除旧策略，避免冲突）
DROP POLICY IF EXISTS "Users can view all weekly reports" ON weekly_reports;
CREATE POLICY "Users can view all weekly reports"
  ON weekly_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert weekly reports" ON weekly_reports;
CREATE POLICY "System can insert weekly reports"
  ON weekly_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update weekly reports" ON weekly_reports;
CREATE POLICY "System can update weekly reports"
  ON weekly_reports FOR UPDATE USING (true);

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ 周报功能命名修复完成！';
  RAISE NOTICE '✅ 表名: weekly_reports';
  RAISE NOTICE '✅ 函数名: generate_weekly_report()';
  RAISE NOTICE '✅ 字段已对齐前端期望';
END $$;
