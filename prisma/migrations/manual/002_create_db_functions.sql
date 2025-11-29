-- =====================================================
-- Phase 1c: 创建数据库函数
-- 用途：将复杂业务逻辑下沉到数据库层
-- 执行：psql -d smart_ledger -f 002_create_db_functions.sql
-- =====================================================

-- =====================================================
-- 1. 周报告数据生成函数
-- 返回指定周的完整报告数据（JSON格式）
-- =====================================================

CREATE OR REPLACE FUNCTION generate_weekly_report_data(
    p_week_start DATE,
    p_week_end DATE,
    p_currency VARCHAR DEFAULT 'CNY'
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_total_expenses NUMERIC;
    v_transaction_count INTEGER;
    v_avg_transaction NUMERIC;
    v_category_breakdown JSON;
    v_top_merchants JSON;
    v_payment_method_stats JSON;
    v_prev_week_total NUMERIC;
    v_wow_change NUMERIC;
    v_wow_percentage NUMERIC;
BEGIN
    -- 基础统计
    SELECT
        COALESCE(SUM(amount), 0),
        COUNT(*),
        COALESCE(AVG(amount), 0)
    INTO v_total_expenses, v_transaction_count, v_avg_transaction
    FROM transactions
    WHERE date >= p_week_start
      AND date <= p_week_end
      AND type = 'expense'
      AND currency = p_currency
      AND deleted_at IS NULL;

    -- 分类分解
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'category', category,
            'amount', total,
            'count', cnt,
            'percentage', ROUND((total / NULLIF(v_total_expenses, 0) * 100)::NUMERIC, 2)
        ) ORDER BY total DESC
    )
    INTO v_category_breakdown
    FROM (
        SELECT
            category,
            SUM(amount) AS total,
            COUNT(*) AS cnt
        FROM transactions
        WHERE date >= p_week_start
          AND date <= p_week_end
          AND type = 'expense'
          AND currency = p_currency
          AND deleted_at IS NULL
        GROUP BY category
    ) sub;

    -- Top 商家
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'merchant', merchant,
            'amount', total,
            'count', cnt
        ) ORDER BY total DESC
    )
    INTO v_top_merchants
    FROM (
        SELECT
            merchant,
            SUM(amount) AS total,
            COUNT(*) AS cnt
        FROM transactions
        WHERE date >= p_week_start
          AND date <= p_week_end
          AND type = 'expense'
          AND currency = p_currency
          AND deleted_at IS NULL
          AND merchant IS NOT NULL
        GROUP BY merchant
        ORDER BY total DESC
        LIMIT 10
    ) sub;

    -- 支付方式统计
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'method', payment_method,
            'amount', total,
            'count', cnt,
            'percentage', ROUND((total / NULLIF(v_total_expenses, 0) * 100)::NUMERIC, 2)
        ) ORDER BY total DESC
    )
    INTO v_payment_method_stats
    FROM (
        SELECT
            COALESCE(payment_method, 'unknown') AS payment_method,
            SUM(amount) AS total,
            COUNT(*) AS cnt
        FROM transactions
        WHERE date >= p_week_start
          AND date <= p_week_end
          AND type = 'expense'
          AND currency = p_currency
          AND deleted_at IS NULL
        GROUP BY payment_method
    ) sub;

    -- 上周数据（用于环比）
    SELECT COALESCE(SUM(amount), 0)
    INTO v_prev_week_total
    FROM transactions
    WHERE date >= p_week_start - INTERVAL '7 days'
      AND date < p_week_start
      AND type = 'expense'
      AND currency = p_currency
      AND deleted_at IS NULL;

    -- 计算环比
    v_wow_change := v_total_expenses - v_prev_week_total;
    v_wow_percentage := CASE
        WHEN v_prev_week_total > 0 THEN
            ROUND(((v_total_expenses - v_prev_week_total) / v_prev_week_total * 100)::NUMERIC, 2)
        ELSE 0
    END;

    -- 构建最终结果
    result := JSON_BUILD_OBJECT(
        'week_start_date', p_week_start,
        'week_end_date', p_week_end,
        'currency', p_currency,
        'total_expenses', v_total_expenses,
        'transaction_count', v_transaction_count,
        'average_transaction', ROUND(v_avg_transaction::NUMERIC, 2),
        'category_breakdown', COALESCE(v_category_breakdown, '[]'::JSON),
        'top_merchants', COALESCE(v_top_merchants, '[]'::JSON),
        'payment_method_stats', COALESCE(v_payment_method_stats, '[]'::JSON),
        'week_over_week_change', v_wow_change,
        'week_over_week_percentage', v_wow_percentage,
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_weekly_report_data(DATE, DATE, VARCHAR) IS
    '生成周报告完整数据，包含分类、商家、支付方式统计和环比';

-- =====================================================
-- 2. 预算状态计算函数
-- 返回指定月份所有分类的预算执行状态
-- =====================================================

CREATE OR REPLACE FUNCTION get_budget_status(
    p_year INTEGER,
    p_month INTEGER,
    p_currency VARCHAR DEFAULT 'CNY'
)
RETURNS TABLE (
    category_key VARCHAR,
    budget_amount NUMERIC,
    spent_amount NUMERIC,
    remaining_amount NUMERIC,
    usage_percentage NUMERIC,
    transaction_count INTEGER,
    status VARCHAR,
    alert_threshold NUMERIC,
    is_over_budget BOOLEAN,
    is_near_limit BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_spending AS (
        SELECT
            t.category,
            COALESCE(SUM(t.amount), 0) AS spent,
            COUNT(*)::INTEGER AS cnt
        FROM transactions t
        WHERE EXTRACT(YEAR FROM t.date) = p_year
          AND EXTRACT(MONTH FROM t.date) = p_month
          AND t.type = 'expense'
          AND t.currency = p_currency
          AND t.deleted_at IS NULL
        GROUP BY t.category
    )
    SELECT
        b.category_key::VARCHAR,
        b.amount AS budget_amount,
        COALESCE(ms.spent, 0) AS spent_amount,
        b.amount - COALESCE(ms.spent, 0) AS remaining_amount,
        CASE
            WHEN b.amount > 0 THEN ROUND((COALESCE(ms.spent, 0) / b.amount * 100)::NUMERIC, 2)
            ELSE 0
        END AS usage_percentage,
        COALESCE(ms.cnt, 0) AS transaction_count,
        CASE
            WHEN COALESCE(ms.spent, 0) > b.amount THEN 'over_budget'
            WHEN COALESCE(ms.spent, 0) >= b.amount * b.alert_threshold THEN 'warning'
            ELSE 'normal'
        END::VARCHAR AS status,
        b.alert_threshold,
        COALESCE(ms.spent, 0) > b.amount AS is_over_budget,
        COALESCE(ms.spent, 0) >= b.amount * b.alert_threshold AS is_near_limit
    FROM budgets b
    LEFT JOIN monthly_spending ms ON b.category_key = ms.category
    WHERE b.year = p_year
      AND b.month = p_month
      AND b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_budget_status(INTEGER, INTEGER, VARCHAR) IS
    '获取指定月份所有分类的预算执行状态';

-- =====================================================
-- 3. 预算预测函数
-- 基于当月支出速率预测月末总支出
-- =====================================================

CREATE OR REPLACE FUNCTION predict_monthly_spending(
    p_year INTEGER,
    p_month INTEGER,
    p_currency VARCHAR DEFAULT 'CNY'
)
RETURNS TABLE (
    category_key VARCHAR,
    current_spending NUMERIC,
    daily_rate NUMERIC,
    days_elapsed INTEGER,
    days_remaining INTEGER,
    predicted_total NUMERIC,
    budget_amount NUMERIC,
    predicted_status VARCHAR
) AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_today DATE := CURRENT_DATE;
    v_days_in_month INTEGER;
    v_days_elapsed INTEGER;
BEGIN
    v_month_start := MAKE_DATE(p_year, p_month, 1);
    v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_days_in_month := EXTRACT(DAY FROM v_month_end);
    v_days_elapsed := LEAST(EXTRACT(DAY FROM v_today), v_days_in_month);

    RETURN QUERY
    WITH spending AS (
        SELECT
            t.category,
            SUM(t.amount) AS total_spent
        FROM transactions t
        WHERE t.date >= v_month_start
          AND t.date <= LEAST(v_today, v_month_end)
          AND t.type = 'expense'
          AND t.currency = p_currency
          AND t.deleted_at IS NULL
        GROUP BY t.category
    )
    SELECT
        b.category_key::VARCHAR,
        COALESCE(s.total_spent, 0) AS current_spending,
        CASE
            WHEN v_days_elapsed > 0 THEN ROUND((COALESCE(s.total_spent, 0) / v_days_elapsed)::NUMERIC, 2)
            ELSE 0
        END AS daily_rate,
        v_days_elapsed,
        v_days_in_month - v_days_elapsed AS days_remaining,
        CASE
            WHEN v_days_elapsed > 0 THEN
                ROUND((COALESCE(s.total_spent, 0) / v_days_elapsed * v_days_in_month)::NUMERIC, 2)
            ELSE 0
        END AS predicted_total,
        b.amount AS budget_amount,
        CASE
            WHEN v_days_elapsed > 0 AND
                 (COALESCE(s.total_spent, 0) / v_days_elapsed * v_days_in_month) > b.amount THEN 'will_exceed'
            WHEN v_days_elapsed > 0 AND
                 (COALESCE(s.total_spent, 0) / v_days_elapsed * v_days_in_month) > b.amount * 0.9 THEN 'at_risk'
            ELSE 'on_track'
        END::VARCHAR AS predicted_status
    FROM budgets b
    LEFT JOIN spending s ON b.category_key = s.category
    WHERE b.year = p_year
      AND b.month = p_month
      AND b.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION predict_monthly_spending(INTEGER, INTEGER, VARCHAR) IS
    '基于当月支出速率预测月末总支出';

-- =====================================================
-- 4. 获取月度汇总函数（使用物化视图）
-- =====================================================

CREATE OR REPLACE FUNCTION get_monthly_summary(
    p_year INTEGER,
    p_month INTEGER,
    p_currency VARCHAR DEFAULT 'CNY'
)
RETURNS TABLE (
    total_expense NUMERIC,
    total_income NUMERIC,
    net_amount NUMERIC,
    expense_count INTEGER,
    income_count INTEGER,
    avg_expense NUMERIC,
    category_count INTEGER,
    active_days INTEGER
) AS $$
DECLARE
    v_month DATE;
BEGIN
    v_month := MAKE_DATE(p_year, p_month, 1);

    RETURN QUERY
    SELECT
        COALESCE(MAX(CASE WHEN type = 'expense' THEN total_amount END), 0) AS total_expense,
        COALESCE(MAX(CASE WHEN type = 'income' THEN total_amount END), 0) AS total_income,
        COALESCE(MAX(CASE WHEN type = 'income' THEN total_amount END), 0) -
            COALESCE(MAX(CASE WHEN type = 'expense' THEN total_amount END), 0) AS net_amount,
        COALESCE(MAX(CASE WHEN type = 'expense' THEN transaction_count END), 0)::INTEGER AS expense_count,
        COALESCE(MAX(CASE WHEN type = 'income' THEN transaction_count END), 0)::INTEGER AS income_count,
        COALESCE(MAX(CASE WHEN type = 'expense' THEN avg_amount END), 0) AS avg_expense,
        COALESCE(MAX(CASE WHEN type = 'expense' THEN category_count END), 0)::INTEGER AS category_count,
        COALESCE(MAX(CASE WHEN type = 'expense' THEN active_days END), 0)::INTEGER AS active_days
    FROM mv_monthly_summary
    WHERE month = v_month
      AND currency = p_currency;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_monthly_summary(INTEGER, INTEGER, VARCHAR) IS
    '获取月度汇总（使用物化视图，高性能）';

-- =====================================================
-- 5. 获取分类趋势函数
-- 返回指定分类最近N个月的趋势数据
-- =====================================================

CREATE OR REPLACE FUNCTION get_category_trend(
    p_category VARCHAR,
    p_months INTEGER DEFAULT 6,
    p_currency VARCHAR DEFAULT 'CNY'
)
RETURNS TABLE (
    month DATE,
    total_amount NUMERIC,
    transaction_count BIGINT,
    avg_amount NUMERIC,
    mom_change NUMERIC,
    mom_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT
            cms.month,
            cms.total_amount,
            cms.transaction_count,
            cms.avg_amount,
            LAG(cms.total_amount) OVER (ORDER BY cms.month) AS prev_month_amount
        FROM mv_category_monthly_stats cms
        WHERE cms.category = p_category
          AND cms.currency = p_currency
          AND cms.type = 'expense'
          AND cms.month >= DATE_TRUNC('month', CURRENT_DATE) - (p_months || ' months')::INTERVAL
        ORDER BY cms.month
    )
    SELECT
        md.month,
        md.total_amount,
        md.transaction_count,
        md.avg_amount,
        md.total_amount - COALESCE(md.prev_month_amount, md.total_amount) AS mom_change,
        CASE
            WHEN md.prev_month_amount > 0 THEN
                ROUND(((md.total_amount - md.prev_month_amount) / md.prev_month_amount * 100)::NUMERIC, 2)
            ELSE 0
        END AS mom_percentage
    FROM monthly_data md
    ORDER BY md.month;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_category_trend(VARCHAR, INTEGER, VARCHAR) IS
    '获取分类最近N个月的趋势数据（使用物化视图）';

-- =====================================================
-- 6. 智能备注推荐函数
-- 基于上下文返回推荐备注
-- =====================================================

CREATE OR REPLACE FUNCTION get_smart_note_suggestions(
    p_category VARCHAR DEFAULT NULL,
    p_time_of_day VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    note_id UUID,
    content TEXT,
    usage_count INTEGER,
    avg_amount NUMERIC,
    confidence NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cn.id AS note_id,
        cn.content,
        cn.usage_count,
        cn.avg_amount,
        -- 计算置信度：基于使用频率、分类匹配、时间匹配
        (
            (cn.usage_count::NUMERIC / (SELECT MAX(usage_count) FROM common_notes WHERE is_active)) * 0.4 +
            CASE WHEN cn.category_affinity = p_category THEN 0.3 ELSE 0 END +
            CASE WHEN p_time_of_day = ANY(cn.time_patterns) THEN 0.3 ELSE 0 END
        ) AS confidence
    FROM common_notes cn
    WHERE cn.is_active = TRUE
      AND (p_category IS NULL OR cn.category_affinity = p_category OR cn.category_affinity IS NULL)
    ORDER BY
        CASE WHEN cn.category_affinity = p_category THEN 0 ELSE 1 END,
        cn.usage_count DESC,
        cn.last_used DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_smart_note_suggestions(VARCHAR, VARCHAR, INTEGER) IS
    '基于上下文返回智能备注推荐';

-- =====================================================
-- 验证函数创建结果
-- =====================================================

DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'generate_weekly_report_data',
        'get_budget_status',
        'predict_monthly_spending',
        'get_monthly_summary',
        'get_category_trend',
        'get_smart_note_suggestions',
        'refresh_all_materialized_views'
    );

    RAISE NOTICE '成功创建 % 个数据库函数', func_count;
END $$;
