-- =====================================================
-- Phase 1e: 修复 Cron upsert 所需唯一约束
-- 用途：恢复 AI 聚合、每日特征提取和消费模式标注任务
-- 执行：psql -d smart_ledger -f 005_fix_cron_upsert_constraints.sql
-- =====================================================

BEGIN;

-- 1. ai_performance_stats:
-- 统一旧数据中的空 model_name，保证与聚合函数的 COALESCE 逻辑一致。
UPDATE ai_performance_stats
SET model_name = 'default'
WHERE model_name IS NULL;

-- 按统计维度去重，保留最近一条记录。
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY stat_date, ai_provider, feature_type, model_name
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM ai_performance_stats
)
DELETE FROM ai_performance_stats
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_performance_stats_upsert
  ON ai_performance_stats (stat_date, ai_provider, feature_type, model_name);

-- 2. transaction_features:
-- 按日期去重，保留最近一条记录。
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY date
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM transaction_features
)
DELETE FROM transaction_features
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_features_upsert
  ON transaction_features (date);

-- 3. spending_patterns:
-- 仅对任务实际使用的非空键去重，保留最近一条记录。
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY transaction_id, pattern_type
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM spending_patterns
  WHERE transaction_id IS NOT NULL
    AND pattern_type IS NOT NULL
)
DELETE FROM spending_patterns
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spending_patterns_upsert
  ON spending_patterns (transaction_id, pattern_type);

COMMIT;
