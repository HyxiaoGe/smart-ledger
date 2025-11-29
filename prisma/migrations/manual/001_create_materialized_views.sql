-- =====================================================
-- Phase 1b: 创建物化视图
-- 用途：预计算月度统计和分类统计，避免实时聚合
-- 执行：psql -d smart_ledger -f 001_create_materialized_views.sql
-- =====================================================

-- 1. 月度汇总物化视图
-- 用于首页统计、月度对比等场景
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_summary;

CREATE MATERIALIZED VIEW mv_monthly_summary AS
SELECT
    DATE_TRUNC('month', date)::DATE AS month,
    currency,
    type,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    MAX(amount) AS max_amount,
    MIN(amount) AS min_amount,
    COUNT(DISTINCT category) AS category_count,
    COUNT(DISTINCT DATE(date)) AS active_days,
    COUNT(DISTINCT merchant) FILTER (WHERE merchant IS NOT NULL) AS merchant_count
FROM transactions
WHERE deleted_at IS NULL
GROUP BY DATE_TRUNC('month', date), currency, type;

-- 创建索引加速查询
CREATE UNIQUE INDEX idx_mv_monthly_summary_unique
    ON mv_monthly_summary(month, currency, type);
CREATE INDEX idx_mv_monthly_summary_month
    ON mv_monthly_summary(month);
CREATE INDEX idx_mv_monthly_summary_currency_type
    ON mv_monthly_summary(currency, type);

COMMENT ON MATERIALIZED VIEW mv_monthly_summary IS '月度交易汇总统计，每小时刷新';

-- =====================================================

-- 2. 分类月度统计物化视图
-- 用于分类统计、预算对比等场景
DROP MATERIALIZED VIEW IF EXISTS mv_category_monthly_stats;

CREATE MATERIALIZED VIEW mv_category_monthly_stats AS
SELECT
    DATE_TRUNC('month', date)::DATE AS month,
    category,
    currency,
    type,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    MAX(amount) AS max_amount,
    MIN(amount) AS min_amount,
    COUNT(DISTINCT DATE(date)) AS active_days,
    COUNT(DISTINCT merchant) FILTER (WHERE merchant IS NOT NULL) AS merchant_count,
    -- 计算环比增长需要的上月数据引用
    ARRAY_AGG(DISTINCT subcategory) FILTER (WHERE subcategory IS NOT NULL) AS subcategories
FROM transactions
WHERE deleted_at IS NULL
GROUP BY DATE_TRUNC('month', date), category, currency, type;

-- 创建索引加速查询
CREATE UNIQUE INDEX idx_mv_category_monthly_unique
    ON mv_category_monthly_stats(month, category, currency, type);
CREATE INDEX idx_mv_category_monthly_month
    ON mv_category_monthly_stats(month);
CREATE INDEX idx_mv_category_monthly_category
    ON mv_category_monthly_stats(category);
CREATE INDEX idx_mv_category_monthly_month_type
    ON mv_category_monthly_stats(month, type);

COMMENT ON MATERIALIZED VIEW mv_category_monthly_stats IS '分类月度统计，每小时刷新';

-- =====================================================

-- 3. 每日汇总物化视图（用于图表展示）
DROP MATERIALIZED VIEW IF EXISTS mv_daily_summary;

CREATE MATERIALIZED VIEW mv_daily_summary AS
SELECT
    date,
    currency,
    type,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
FROM transactions
WHERE deleted_at IS NULL
GROUP BY date, currency, type;

-- 创建索引
CREATE UNIQUE INDEX idx_mv_daily_summary_unique
    ON mv_daily_summary(date, currency, type);
CREATE INDEX idx_mv_daily_summary_date
    ON mv_daily_summary(date);

COMMENT ON MATERIALIZED VIEW mv_daily_summary IS '每日交易汇总，用于趋势图表';

-- =====================================================

-- 4. 支付方式统计物化视图
DROP MATERIALIZED VIEW IF EXISTS mv_payment_method_stats;

CREATE MATERIALIZED VIEW mv_payment_method_stats AS
SELECT
    DATE_TRUNC('month', date)::DATE AS month,
    payment_method,
    currency,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
FROM transactions
WHERE deleted_at IS NULL
    AND type = 'expense'
    AND payment_method IS NOT NULL
GROUP BY DATE_TRUNC('month', date), payment_method, currency;

-- 创建索引
CREATE UNIQUE INDEX idx_mv_payment_method_unique
    ON mv_payment_method_stats(month, payment_method, currency);
CREATE INDEX idx_mv_payment_method_month
    ON mv_payment_method_stats(month);

COMMENT ON MATERIALIZED VIEW mv_payment_method_stats IS '支付方式月度统计';

-- =====================================================

-- 5. 商家统计物化视图（Top 商家）
DROP MATERIALIZED VIEW IF EXISTS mv_merchant_stats;

CREATE MATERIALIZED VIEW mv_merchant_stats AS
SELECT
    DATE_TRUNC('month', date)::DATE AS month,
    merchant,
    category,
    currency,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    MAX(date) AS last_transaction_date
FROM transactions
WHERE deleted_at IS NULL
    AND type = 'expense'
    AND merchant IS NOT NULL
GROUP BY DATE_TRUNC('month', date), merchant, category, currency;

-- 创建索引
CREATE UNIQUE INDEX idx_mv_merchant_stats_unique
    ON mv_merchant_stats(month, merchant, category, currency);
CREATE INDEX idx_mv_merchant_stats_month
    ON mv_merchant_stats(month);
CREATE INDEX idx_mv_merchant_stats_total
    ON mv_merchant_stats(month, total_amount DESC);

COMMENT ON MATERIALIZED VIEW mv_merchant_stats IS '商家月度统计，用于 Top 商家排名';

-- =====================================================

-- 刷新所有物化视图的函数
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_monthly_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_method_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_merchant_stats;

    RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_materialized_views() IS '刷新所有物化视图，建议每小时执行';

-- =====================================================

-- 验证创建结果
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM pg_matviews
    WHERE schemaname = 'public'
    AND matviewname LIKE 'mv_%';

    RAISE NOTICE '成功创建 % 个物化视图', view_count;
END $$;
