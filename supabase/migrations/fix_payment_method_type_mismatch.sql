-- ========================================
-- 修复支付方式统计的类型不匹配问题
-- ========================================
-- 问题：transactions.payment_method 是 text 类型，payment_methods.id 是 uuid 类型
-- 解决：在 JOIN 时进行类型转换

-- 删除并重新创建 generate_weekly_report 函数
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

  -- 统计支付方式（修复类型不匹配问题）
  -- 关键修改：使用 CASE 语句处理 text 到 uuid 的转换
  SELECT COALESCE(jsonb_agg(payment_stats), '[]'::jsonb)
  INTO v_payment_stats
  FROM (
    SELECT jsonb_build_object(
      'method', COALESCE(pm.name, '未指定'),
      'amount', SUM(t.amount),
      'count', COUNT(*),
      'percentage', ROUND((SUM(t.amount) / NULLIF(v_total_expenses, 0) * 100)::numeric, 2)
    ) AS payment_stats
    FROM transactions t
    LEFT JOIN payment_methods pm ON
      CASE
        WHEN t.payment_method IS NOT NULL AND t.payment_method ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN t.payment_method::uuid
        ELSE NULL
      END = pm.id
    WHERE t.type = 'expense'
      AND t.deleted_at IS NULL
      AND t.date >= v_week_start
      AND t.date <= v_week_end
    GROUP BY pm.id, pm.name
    ORDER BY SUM(t.amount) DESC
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

  -- 插入报告
  INSERT INTO weekly_reports (
    week_start_date,
    week_end_date,
    total_expenses,
    transaction_count,
    category_breakdown,
    top_merchants,
    payment_method_stats,
    week_over_week_change,
    week_over_week_percentage,
    ai_insights
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

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ 支付方式类型不匹配问题已修复！';
  RAISE NOTICE '✅ 函数名: generate_weekly_report()';
  RAISE NOTICE '✅ 使用正则表达式验证 UUID 格式并进行类型转换';
END $$;
