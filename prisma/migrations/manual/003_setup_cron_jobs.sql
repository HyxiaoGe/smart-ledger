-- =====================================================
-- Phase 1d: 设置 Cron 定时任务
-- 前提：需要启用 pg_cron 扩展
-- 执行：psql -d smart_ledger -f 003_setup_cron_jobs.sql
-- =====================================================

-- 确保 pg_cron 扩展已启用
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 1. 物化视图刷新任务（每小时）
-- =====================================================

-- 删除已存在的任务（如果有）
SELECT cron.unschedule('refresh-materialized-views')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-materialized-views');

-- 创建物化视图刷新任务 - 每小时执行
SELECT cron.schedule(
    'refresh-materialized-views',
    '0 * * * *',  -- 每小时的第0分钟
    $$SELECT refresh_all_materialized_views()$$
);

-- =====================================================
-- 2. 预算建议预计算任务（每天凌晨1点）
-- =====================================================

-- 创建预算建议刷新函数
CREATE OR REPLACE FUNCTION refresh_budget_suggestions()
RETURNS void AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
    -- 删除当月旧的建议
    DELETE FROM budget_suggestions
    WHERE year = v_year AND month = v_month;

    -- 基于历史数据生成新建议
    INSERT INTO budget_suggestions (
        category_key,
        year,
        month,
        currency,
        suggested_amount,
        confidence_level,
        reason,
        historical_avg,
        historical_months,
        current_month_spending,
        current_daily_rate,
        predicted_month_total,
        trend_direction,
        days_into_month,
        is_active
    )
    SELECT
        category,
        v_year,
        v_month,
        'CNY',
        -- 建议金额：历史平均 * 1.1（留10%余量）
        ROUND(COALESCE(AVG(monthly_total), 0) * 1.1, 2),
        CASE
            WHEN COUNT(*) >= 4 THEN 'high'
            WHEN COUNT(*) >= 2 THEN 'medium'
            ELSE 'low'
        END,
        '基于过去 ' || COUNT(*) || ' 个月的历史数据',
        ROUND(COALESCE(AVG(monthly_total), 0), 2),
        COUNT(*)::INTEGER,
        0, -- 当月支出稍后更新
        0, -- 日均稍后更新
        0, -- 预测稍后更新
        CASE
            WHEN COUNT(*) >= 2 AND
                 (SELECT SUM(monthly_total) FROM (
                     SELECT SUM(amount) as monthly_total
                     FROM transactions
                     WHERE category = t.category
                       AND deleted_at IS NULL
                       AND type = 'expense'
                       AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
                     GROUP BY DATE_TRUNC('month', date)
                     ORDER BY DATE_TRUNC('month', date) DESC
                     LIMIT 1
                 ) recent) >
                 (SELECT SUM(monthly_total) FROM (
                     SELECT SUM(amount) as monthly_total
                     FROM transactions
                     WHERE category = t.category
                       AND deleted_at IS NULL
                       AND type = 'expense'
                       AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
                       AND date < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
                     GROUP BY DATE_TRUNC('month', date)
                     ORDER BY DATE_TRUNC('month', date) DESC
                     LIMIT 1
                 ) older) THEN 'up'
            ELSE 'stable'
        END,
        EXTRACT(DAY FROM CURRENT_DATE)::INTEGER,
        TRUE
    FROM (
        SELECT
            category,
            DATE_TRUNC('month', date) as month,
            SUM(amount) as monthly_total
        FROM transactions
        WHERE deleted_at IS NULL
          AND type = 'expense'
          AND date >= CURRENT_DATE - INTERVAL '12 months'
          AND date < DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY category, DATE_TRUNC('month', date)
    ) t
    GROUP BY category
    HAVING COUNT(*) >= 1;

    RAISE NOTICE '预算建议已刷新: %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_budget_suggestions() IS '刷新预算建议，建议每天执行';

-- 删除已存在的任务
SELECT cron.unschedule('refresh-budget-suggestions-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-budget-suggestions-daily');

-- 创建预算建议刷新任务 - 每天凌晨1点
SELECT cron.schedule(
    'refresh-budget-suggestions-daily',
    '0 1 * * *',
    $$SELECT refresh_budget_suggestions()$$
);

-- =====================================================
-- 3. 周报告自动生成任务（每周一凌晨2点）
-- =====================================================

-- 创建周报告生成函数
CREATE OR REPLACE FUNCTION generate_weekly_report_auto()
RETURNS void AS $$
DECLARE
    v_week_start DATE;
    v_week_end DATE;
    v_report_data JSON;
    v_exists BOOLEAN;
BEGIN
    -- 计算上一周的日期范围
    v_week_start := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days')::DATE;
    v_week_end := v_week_start + INTERVAL '6 days';

    -- 检查是否已存在
    SELECT EXISTS(
        SELECT 1 FROM weekly_reports
        WHERE week_start_date = v_week_start
    ) INTO v_exists;

    IF v_exists THEN
        RAISE NOTICE '周报告已存在: % - %', v_week_start, v_week_end;
        RETURN;
    END IF;

    -- 生成报告数据
    v_report_data := generate_weekly_report_data(v_week_start, v_week_end, 'CNY');

    -- 插入周报告
    INSERT INTO weekly_reports (
        week_start_date,
        week_end_date,
        total_expenses,
        transaction_count,
        average_transaction,
        category_breakdown,
        top_merchants,
        payment_method_stats,
        week_over_week_change,
        week_over_week_percentage,
        generation_type,
        generated_at
    )
    SELECT
        v_week_start,
        v_week_end,
        (v_report_data->>'total_expenses')::NUMERIC,
        (v_report_data->>'transaction_count')::INTEGER,
        (v_report_data->>'average_transaction')::NUMERIC,
        v_report_data->'category_breakdown',
        v_report_data->'top_merchants',
        v_report_data->'payment_method_stats',
        (v_report_data->>'week_over_week_change')::NUMERIC,
        (v_report_data->>'week_over_week_percentage')::NUMERIC,
        'auto',
        NOW();

    RAISE NOTICE '周报告已生成: % - %', v_week_start, v_week_end;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_weekly_report_auto() IS '自动生成上周的周报告';

-- 删除已存在的任务
SELECT cron.unschedule('generate-weekly-report')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-weekly-report');

-- 创建周报告生成任务 - 每周一凌晨2点
SELECT cron.schedule(
    'generate-weekly-report',
    '0 2 * * 1',
    $$SELECT generate_weekly_report_auto()$$
);

-- =====================================================
-- 4. 数据质量检查任务（每天凌晨3点）
-- =====================================================

-- 创建数据质量检查函数
CREATE OR REPLACE FUNCTION check_data_quality()
RETURNS void AS $$
DECLARE
    v_report_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- 删除已有的当天报告
    DELETE FROM data_quality_reports WHERE report_date = v_report_date;

    -- 插入新的质量报告
    INSERT INTO data_quality_reports (
        report_date,
        total_transactions,
        transactions_with_merchant,
        transactions_with_note,
        transactions_missing_category,
        negative_amounts,
        zero_amounts,
        extreme_amounts,
        duplicate_records,
        inconsistent_dates,
        quality_score
    )
    SELECT
        v_report_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE merchant IS NOT NULL),
        COUNT(*) FILTER (WHERE note IS NOT NULL AND note != ''),
        COUNT(*) FILTER (WHERE category IS NULL OR category = ''),
        COUNT(*) FILTER (WHERE amount < 0),
        COUNT(*) FILTER (WHERE amount = 0),
        COUNT(*) FILTER (WHERE amount > 100000),  -- 超过10万视为异常
        (
            SELECT COUNT(*) FROM (
                SELECT date, amount, category, note
                FROM transactions
                WHERE deleted_at IS NULL
                  AND date = v_report_date
                GROUP BY date, amount, category, note
                HAVING COUNT(*) > 1
            ) dups
        ),
        COUNT(*) FILTER (WHERE date > CURRENT_DATE),  -- 未来日期
        -- 计算质量分数 (0-100)
        ROUND((
            (COUNT(*) FILTER (WHERE merchant IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0) * 25) +
            (COUNT(*) FILTER (WHERE note IS NOT NULL AND note != '')::NUMERIC / NULLIF(COUNT(*), 0) * 25) +
            (1 - COUNT(*) FILTER (WHERE amount <= 0)::NUMERIC / NULLIF(COUNT(*), 0)) * 25 +
            (1 - COUNT(*) FILTER (WHERE category IS NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 25
        )::NUMERIC, 2)
    FROM transactions
    WHERE deleted_at IS NULL
      AND date = v_report_date;

    RAISE NOTICE '数据质量检查完成: %', v_report_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_data_quality() IS '检查数据质量并生成报告';

-- 删除已存在的任务
SELECT cron.unschedule('check-data-quality')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-data-quality');

-- 创建数据质量检查任务 - 每天凌晨3点
SELECT cron.schedule(
    'check-data-quality',
    '0 3 * * *',
    $$SELECT check_data_quality()$$
);

-- =====================================================
-- 5. 清理旧日志任务（每天凌晨4点）
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- 清理30天前的系统日志
    DELETE FROM system_logs
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '清理系统日志: % 条', v_deleted_count;

    -- 清理30天前的错误日志
    DELETE FROM recent_errors
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '清理错误日志: % 条', v_deleted_count;

    -- 清理90天前的 AI 请求日志
    DELETE FROM ai_requests
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '清理 AI 请求日志: % 条', v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_logs() IS '清理过期日志';

-- 删除已存在的任务
SELECT cron.unschedule('cleanup-old-logs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-logs');

-- 创建清理旧日志任务 - 每天凌晨4点
SELECT cron.schedule(
    'cleanup-old-logs',
    '0 4 * * *',
    $$SELECT cleanup_old_logs()$$
);

-- =====================================================
-- 验证 Cron 任务设置结果
-- =====================================================

DO $$
DECLARE
    job_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO job_count
    FROM cron.job
    WHERE jobname IN (
        'refresh-materialized-views',
        'refresh-budget-suggestions-daily',
        'generate-weekly-report',
        'check-data-quality',
        'cleanup-old-logs'
    );

    RAISE NOTICE '成功设置 % 个 Cron 任务', job_count;
END $$;

-- 查看所有任务
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname LIKE 'refresh%'
   OR jobname LIKE 'generate%'
   OR jobname LIKE 'check%'
   OR jobname LIKE 'cleanup%'
ORDER BY jobname;
