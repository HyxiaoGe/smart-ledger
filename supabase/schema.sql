-- Smart Ledger 完整数据库架构
-- 包含基础表结构、智能学习功能和历史数据更新

-- ========================================
-- 1. 基础扩展和函数
-- ========================================

-- 启用生成 UUID 的扩展
create extension if not exists pgcrypto;

-- 创建一个用于更新建议统计的函数
CREATE OR REPLACE FUNCTION update_suggestion_stats(
  p_suggestion_type text,
  p_success boolean DEFAULT false,
  p_confidence numeric DEFAULT null
) RETURNS void AS $$
BEGIN
  INSERT INTO public.suggestion_type_stats (suggestion_type, total_usage, success_count, confidence_sum, last_updated)
  VALUES (p_suggestion_type, 1, CASE WHEN p_success THEN 1 ELSE 0 END, COALESCE(p_confidence, 0), now())
  ON CONFLICT (suggestion_type)
  DO UPDATE SET
    total_usage = suggestion_type_stats.total_usage + 1,
    success_count = suggestion_type_stats.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    confidence_sum = suggestion_type_stats.confidence_sum + COALESCE(p_confidence, 0),
    last_updated = now();
END;
$$ LANGUAGE plpgsql;

-- 创建一个用于获取建议类型成功率的函数
CREATE OR REPLACE FUNCTION get_suggestion_success_rate(p_suggestion_type text)
RETURNS numeric(3,2) AS $$
DECLARE
  total_count integer;
  success_count integer;
BEGIN
  SELECT total_usage, success_count
  INTO total_count, success_count
  FROM public.suggestion_type_stats
  WHERE suggestion_type = p_suggestion_type;

  IF total_count IS NULL OR total_count = 0 THEN
    RETURN 0.0;
  END IF;

  RETURN ROUND((success_count::numeric / total_count::numeric) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- 创建原子化的交易记录更新或插入函数（解决竞态条件）
CREATE OR REPLACE FUNCTION upsert_transaction(
  p_type text,
  p_category text,
  p_amount numeric,
  p_note text,
  p_date date,
  p_currency text,
  p_payment_method text DEFAULT NULL,
  p_merchant text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_product text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_transaction_id uuid;
  v_existing_amount numeric;
  v_deleted_at timestamptz;
BEGIN
  -- 使用 FOR UPDATE 锁定查询，防止竞态条件
  SELECT id, amount, deleted_at
  INTO v_transaction_id, v_existing_amount, v_deleted_at
  FROM public.transactions
  WHERE type = p_type
    AND category = p_category
    AND date = p_date
    AND currency = p_currency
    AND note = p_note
  FOR UPDATE;

  IF v_transaction_id IS NOT NULL THEN
    -- 记录存在，更新
    IF v_deleted_at IS NOT NULL THEN
      -- 已删除的记录，恢复并替换金额
      UPDATE public.transactions
      SET amount = p_amount,
          deleted_at = NULL,
          payment_method = p_payment_method,
          merchant = p_merchant,
          subcategory = p_subcategory,
          product = p_product
      WHERE id = v_transaction_id;
    ELSE
      -- 未删除的记录，累加金额
      UPDATE public.transactions
      SET amount = v_existing_amount + p_amount,
          payment_method = COALESCE(p_payment_method, payment_method),
          merchant = COALESCE(p_merchant, merchant),
          subcategory = COALESCE(p_subcategory, subcategory),
          product = COALESCE(p_product, product)
      WHERE id = v_transaction_id;
    END IF;
  ELSE
    -- 记录不存在，插入
    INSERT INTO public.transactions (type, category, amount, note, date, currency, payment_method, merchant, subcategory, product)
    VALUES (p_type, p_category, p_amount, p_note, p_date, p_currency, p_payment_method, p_merchant, p_subcategory, p_product)
    RETURNING id INTO v_transaction_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. 基础表结构
-- ========================================

-- 交易记录表
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income','expense')),
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  note text,
  date date not null,
  deleted_at timestamptz,
  currency text not null default 'CNY' check (currency in ('CNY','USD')),
  created_at timestamptz not null default now()
);

-- 添加扩展字段（如果不存在）
DO $$
BEGIN
  -- 添加支付方式字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='transactions' AND column_name='payment_method') THEN
    ALTER TABLE public.transactions ADD COLUMN payment_method text;
  END IF;

  -- 添加商家字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='transactions' AND column_name='merchant') THEN
    ALTER TABLE public.transactions ADD COLUMN merchant text;
  END IF;

  -- 添加子分类字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='transactions' AND column_name='subcategory') THEN
    ALTER TABLE public.transactions ADD COLUMN subcategory text;
  END IF;

  -- 添加产品字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='transactions' AND column_name='product') THEN
    ALTER TABLE public.transactions ADD COLUMN product text;
  END IF;
END $$;

-- 常用索引
create index if not exists idx_transactions_date on public.transactions (date desc);
create index if not exists idx_transactions_type on public.transactions (type);
create index if not exists idx_transactions_category on public.transactions (category);
create index if not exists idx_transactions_deleted_at on public.transactions (deleted_at);

-- 常用备注表（支持智能分析）
create table if not exists public.common_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  usage_count integer not null default 1,
  last_used timestamptz not null default now(),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  -- 智能分析字段
  context_tags text[], -- 场景标签，如：['工作日', '午餐', '外卖']
  avg_amount numeric, -- 平均金额
  time_patterns text[], -- 时间模式，如：['工作日12:00-13:00', '周末18:00-20:00']
  category_affinity text -- 类别关联度最强的类别
);

-- 常用备注表索引
create index if not exists idx_common_notes_content on public.common_notes (content);
create index if not exists idx_common_notes_usage_count on public.common_notes (usage_count desc);
create index if not exists idx_common_notes_last_used on public.common_notes (last_used desc);
create index if not exists idx_common_notes_active on public.common_notes (is_active);
create index if not exists idx_common_notes_category on public.common_notes (category_affinity);
create index if not exists idx_common_notes_avg_amount on public.common_notes (avg_amount);

-- AI分析数据表（用户无感知）
create table if not exists public.note_analytics (
  note_id uuid references public.common_notes(id) on delete cascade,
  typical_amount numeric(12,2),
  preferred_time text,
  confidence_score numeric(3,2) default 0.0 check (confidence_score >= 0 and confidence_score <= 1),
  updated_at timestamptz not null default now(),
  primary key (note_id)
);

-- ========================================
-- 3. 智能学习功能表
-- ========================================

-- 学习记录日志表
create table if not exists public.suggestion_learning_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_type text not null check (event_type in ('suggestion_selected', 'suggestion_ignored', 'manual_input')),
  timestamp timestamptz not null default now(),
  context jsonb not null, -- 存储上下文信息：category, amount, currency, time_context, partial_input
  suggestion_data jsonb, -- 存储被选择的建议信息
  ignored_suggestions jsonb[], -- 存储被忽略的建议列表
  final_input text not null, -- 用户最终输入的内容
  learning_outcome text not null check (learning_outcome in ('positive', 'negative', 'neutral')),
  created_at timestamptz not null default now()
);

-- 建议类型统计表
create table if not exists public.suggestion_type_stats (
  id uuid primary key default gen_random_uuid(),
  suggestion_type text not null unique, -- context, pattern, frequency, similarity
  total_usage integer not null default 0, -- 总使用次数
  success_count integer not null default 0, -- 成功（被选择）次数
  confidence_sum numeric(5,2) not null default 0.0, -- 置信度总和，用于计算平均置信度
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 用户行为模式表（为未来用户系统预留）
create table if not exists public.user_behavior_patterns (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  pattern_type text not null, -- time_pattern, amount_pattern, category_pattern
  pattern_data jsonb not null, -- 模式数据
  strength numeric(3,2) not null default 0.0, -- 模式强度 0-1
  last_observed timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 索引优化
create index if not exists idx_suggestion_learning_logs_session_id on public.suggestion_learning_logs(session_id);
create index if not exists idx_suggestion_learning_logs_timestamp on public.suggestion_learning_logs(timestamp DESC);
create index if not exists idx_suggestion_learning_logs_event_type on public.suggestion_learning_logs(event_type);
create index if not exists idx_suggestion_learning_logs_outcome on public.suggestion_learning_logs(learning_outcome);
create index if not exists idx_suggestion_learning_logs_context on public.suggestion_learning_logs USING GIN(context);

create index if not exists idx_suggestion_type_stats_type on public.suggestion_type_stats(suggestion_type);
create index if not exists idx_suggestion_type_stats_updated on public.suggestion_type_stats(last_updated DESC);

create index if not exists idx_user_behavior_patterns_session on public.user_behavior_patterns(session_id);
create index if not exists idx_user_behavior_patterns_type on public.user_behavior_patterns(pattern_type);
create index if not exists idx_user_behavior_patterns_strength on public.user_behavior_patterns(strength DESC);

-- ========================================
-- 4. 行级安全策略
-- ========================================

-- 启用行级安全
alter table public.transactions enable row level security;
alter table public.common_notes enable row level security;
alter table public.note_analytics enable row level security;
alter table public.suggestion_learning_logs enable row level security;
alter table public.suggestion_type_stats enable row level security;
alter table public.user_behavior_patterns enable row level security;

-- transactions 表的匿名访问策略
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'allow_anon_select'
  ) then
    create policy allow_anon_select on public.transactions for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'allow_anon_insert'
  ) then
    create policy allow_anon_insert on public.transactions for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'allow_anon_update'
  ) then
    create policy allow_anon_update on public.transactions for update to anon using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions' and policyname = 'allow_anon_delete'
  ) then
    create policy allow_anon_delete on public.transactions for delete to anon using (true);
  end if;
end $$;

-- common_notes 表的匿名访问策略
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'common_notes' and policyname = 'allow_anon_select'
  ) then
    create policy allow_anon_select on public.common_notes for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'common_notes' and policyname = 'allow_anon_insert'
  ) then
    create policy allow_anon_insert on public.common_notes for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'common_notes' and policyname = 'allow_anon_update'
  ) then
    create policy allow_anon_update on public.common_notes for update to anon using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'common_notes' and policyname = 'allow_anon_delete'
  ) then
    create policy allow_anon_delete on public.common_notes for delete to anon using (true);
  end if;
end $$;

-- note_analytics 表的匿名访问策略
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'note_analytics' and policyname = 'allow_anon_select'
  ) then
    create policy allow_anon_select on public.note_analytics for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'note_analytics' and policyname = 'allow_anon_insert'
  ) then
    create policy allow_anon_insert on public.note_analytics for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'note_analytics' and policyname = 'allow_anon_update'
  ) then
    create policy allow_anon_update on public.note_analytics for update to anon using (true) with check (true);
  end if;
end $$;

-- 学习记录表的匿名访问策略
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'suggestion_learning_logs' and policyname = 'allow_anon_insert'
  ) then
    create policy allow_anon_insert on public.suggestion_learning_logs for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'suggestion_learning_logs' and policyname = 'allow_anon_select'
  ) then
    create policy allow_anon_select on public.suggestion_learning_logs for select to anon using (true);
  end if;
end $$;

-- 建议统计表的匿名访问策略
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'suggestion_type_stats' and policyname = 'allow_anon_insert'
  ) then
    create policy allow_anon_insert on public.suggestion_type_stats for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'suggestion_type_stats' and policyname = 'allow_anon_update'
  ) then
    create policy allow_anon_update on public.suggestion_type_stats for update to anon using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'suggestion_type_stats' and policyname = 'allow_anon_select'
  ) then
    create policy allow_anon_select on public.suggestion_type_stats for select to anon using (true);
  end if;
end $$;

-- 用户行为模式表的匿名访问策略
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_behavior_patterns' and policyname = 'allow_anon_insert'
  ) then
    create policy allow_anon_insert on public.user_behavior_patterns for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_behavior_patterns' and policyname = 'allow_anon_select'
  ) then
    create policy allow_anon_select on public.user_behavior_patterns for select to anon using (true);
  end if;
end $$;

-- ========================================
-- 5. 基于真实历史数据的智能备注更新
-- ========================================

-- 🎯 瑞幸咖啡系列更新 (基于 11 次真实消费记录)
UPDATE public.common_notes
SET
  avg_amount = 11.54,
  category_affinity = 'drink',
  context_tags = ARRAY['咖啡', '饮品', '提神', '咖啡连锁', '品牌咖啡'],
  time_patterns = ARRAY['高频使用', '日常消费'],
  usage_count = 19,
  last_used = '2025-10-25'
WHERE content = '瑞幸';

UPDATE public.common_notes
SET
  avg_amount = 9.90,
  category_affinity = 'drink',
  context_tags = ARRAY['咖啡', '饮品', '提神', '咖啡连锁', '品牌咖啡'],
  time_patterns = ARRAY['高频使用', '日常消费'],
  usage_count = 3,
  last_used = '2025-10-13'
WHERE content = '瑞幸咖啡';

UPDATE public.common_notes
SET
  avg_amount = 12.48,
  category_affinity = 'drink',
  context_tags = ARRAY['咖啡', '饮品', '提神', '咖啡连锁', '品牌咖啡', '椰子水'],
  time_patterns = ARRAY['偶尔使用'],
  usage_count = 1,
  last_used = '2025-10-10'
WHERE content = '瑞幸椰子水';

-- 🚇 地铁通勤系列更新 (基于 12 次真实消费记录)
UPDATE public.common_notes
SET
  avg_amount = 6.00,
  category_affinity = 'transport',
  context_tags = ARRAY['出行', '通勤', '交通工具', '公共交通'],
  time_patterns = ARRAY['高频使用', '日常消费', '定期消费'],
  usage_count = 12,
  last_used = '2025-10-25'
WHERE content = '地铁通行费用';

UPDATE public.common_notes
SET
  avg_amount = 8.00,
  category_affinity = 'transport',
  context_tags = ARRAY['出行', '通勤', '交通工具', '公共交通'],
  time_patterns = ARRAY['中频使用'],
  usage_count = 3,
  last_used = '2025-10-07'
WHERE content = '地铁通勤';

UPDATE public.common_notes
SET
  avg_amount = 6.00,
  category_affinity = 'transport',
  context_tags = ARRAY['出行', '通勤', '交通工具', '公共交通'],
  time_patterns = ARRAY['偶尔使用'],
  usage_count = 1,
  last_used = '2025-10-01'
WHERE content = '地铁';

-- 🍱 午饭系列更新 (基于 22 次真实消费记录)
UPDATE public.common_notes
SET
  avg_amount = 16.82,
  category_affinity = 'food',
  context_tags = ARRAY['餐饮', '吃饭', '正餐', '定时用餐', '午餐'],
  time_patterns = ARRAY['高频使用', '日常消费'],
  usage_count = 22,
  last_used = '2025-10-23'
WHERE content = '午饭';

-- 🍙 晚饭系列更新
UPDATE public.common_notes
SET
  avg_amount = 17.73,
  category_affinity = 'food',
  context_tags = ARRAY['餐饮', '吃饭', '正餐', '定时用餐', '晚餐'],
  time_patterns = ARRAY['中频使用', '定期消费'],
  usage_count = 8,
  last_used = '2025-10-22'
WHERE content = '晚饭';

-- 🥖 面包系列更新 (基于 11 次真实消费记录)
UPDATE public.common_notes
SET
  avg_amount = 14.90,
  category_affinity = 'daily',
  context_tags = ARRAY['日用品', '生活必需品', '早餐', '零食'],
  time_patterns = ARRAY['中频使用', '定期消费'],
  usage_count = 11,
  last_used = '2025-10-23'
WHERE content = '面包';

-- 🛒 AI订阅系列更新 (基于 7 次真实消费记录)
UPDATE public.common_notes
SET
  avg_amount = 16.53,
  category_affinity = 'subscription',
  context_tags = ARRAY['订阅', '会员', '服务', 'AI工具', '技术'],
  time_patterns = ARRAY['中频使用', '定期消费'],
  usage_count = 7,
  last_used = '2025-10-24'
WHERE content = 'AI订阅费用';

-- 🛒 柴米油盐系列更新 (基于 4 次真实消费记录)
UPDATE public.common_notes
SET
  avg_amount = 75.07,
  category_affinity = 'daily',
  context_tags = ARRAY['日用品', '生活必需品', '食材', '家庭用品', '采购'],
  time_patterns = ARRAY['定期消费'],
  usage_count = 4,
  last_used = '2025-10-19'
WHERE content = '柴米油盐';

-- 🚲 共享单车系列更新 (基于 1 次真实消费记录，但使用频率较高)
UPDATE public.common_notes
SET
  avg_amount = 3.79,
  category_affinity = 'transport',
  context_tags = ARRAY['出行', '交通工具', '短途', '环保出行'],
  time_patterns = ARRAY['偶尔使用'],
  usage_count = 7,
  last_used = '2025-10-18'
WHERE content = '共享单车';

-- 插入缺失的智能备注记录（基于 transactions 中的高频消费）
-- 使用 INSERT ... WHERE NOT EXISTS 避免重复插入
INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '美团外卖（午饭）', 3, '2025-10-12', '2025-10-12', true, 16.33, 'food', ARRAY['餐饮', '吃饭', '外送', '线上订餐', '午餐'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '美团外卖（午饭）');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '美团外卖（晚饭）', 1, '2025-10-12', '2025-10-12', true, 18.80, 'food', ARRAY['餐饮', '吃饭', '外送', '线上订餐', '晚餐'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '美团外卖（晚饭）');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '午饭费', 1, '2025-10-10', '2025-10-10', true, 14.86, 'food', ARRAY['餐饮', '吃饭', '正餐', '定时用餐', '午餐'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '午饭费');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '盒马日常购物', 1, '2025-10-06', '2025-10-06', true, 40.76, 'daily', ARRAY['日用品', '生活必需品', '采购', '超市'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '盒马日常购物');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '盒马外卖', 1, '2025-10-01', '2025-10-01', true, 52.20, 'daily', ARRAY['日用品', '生活必需品', '外送', '线上订餐'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '盒马外卖');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '京东购物', 1, '2025-10-12', '2025-10-12', true, 110.19, 'daily', ARRAY['日用品', '生活必需品', '采购', '网购'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '京东购物');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '美团外卖', 1, '2025-10-01', '2025-10-01', true, 12.80, 'food', ARRAY['餐饮', '吃饭', '外送', '线上订餐'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '美团外卖');

INSERT INTO public.common_notes (content, usage_count, last_used, created_at, is_active, avg_amount, category_affinity, context_tags, time_patterns)
SELECT '滴滴打车费', 1, '2025-10-08', '2025-10-08', true, 18.81, 'transport', ARRAY['出行', '交通工具', '打车', '应急出行'], ARRAY['偶尔使用']
WHERE NOT EXISTS (SELECT 1 FROM public.common_notes WHERE content = '滴滴打车费');

-- ========================================
-- 6. 数据验证查询
-- ========================================

-- 验证更新结果
SELECT
  content,
  usage_count,
  avg_amount,
  category_affinity,
  context_tags,
  time_patterns,
  last_used
FROM public.common_notes
WHERE avg_amount IS NOT NULL
ORDER BY usage_count DESC, last_used DESC;

-- 显示瑞幸相关的智能备注
SELECT
  content,
  usage_count,
  avg_amount,
  category_affinity,
  context_tags
FROM public.common_notes
WHERE content ILIKE '%瑞幸%'
ORDER BY usage_count DESC;

-- 显示表结构信息
SELECT
  schemaname,
  tablename,
  table_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'common_notes', 'note_analytics', 'suggestion_learning_logs', 'suggestion_type_stats', 'user_behavior_patterns')
ORDER BY tablename, ordinal_position;

-- 显示创建的索引
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- AI请求日志表
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  ai_provider VARCHAR(50) NOT NULL DEFAULT 'deepseek', -- AI提供商
  model_name VARCHAR(100), -- 模型名称
  request_type VARCHAR(50) NOT NULL, -- 请求类型
  feature_type VARCHAR(50) NOT NULL, -- 功能类型
  session_id VARCHAR(100),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 请求信息
  input_data JSONB NOT NULL, -- 输入数据
  parameters JSONB, -- 请求参数
  prompt TEXT, -- 完整的提示词

  -- 响应信息
  response_data JSONB, -- 响应数据
  response_text TEXT, -- 响应文本
  tokens_used JSONB, -- Token使用情况 {input: int, output: int, total: int}
  response_time_ms INTEGER, -- 响应时间（毫秒）

  -- 状态信息
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'cancelled')),
  error_code VARCHAR(50),
  error_message TEXT,

  -- 元数据
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  request_id VARCHAR(100), -- 请求追踪ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_requests_feature_type ON ai_requests(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_requests_timestamp ON ai_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_requests_session_id ON ai_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_ai_provider ON ai_requests(ai_provider);

-- AI反馈表
CREATE TABLE IF NOT EXISTS ai_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  feature_type VARCHAR(50) NOT NULL, -- AI功能类型
  feedback_type VARCHAR(50) NOT NULL, -- 反馈类型
  session_id VARCHAR(100), -- 用户会话ID
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 用户ID（如果支持登录）

  -- 反馈内容
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 评分 (1-5)
  is_positive BOOLEAN, -- 赞/踩
  comment TEXT, -- 文字评论
  choices TEXT[], -- 多选答案 (JSON数组)
  custom_data JSONB, -- 自定义数据

  -- 上下文信息
  context JSONB, -- 上下文信息（输入数据、输出结果、参数等）
  ai_request_id UUID REFERENCES ai_requests(id) ON DELETE SET NULL, -- 关联的AI请求

  -- 元数据
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  client_version VARCHAR(50),
  ip_address INET,

  -- 分析标记
  tags TEXT[], -- 标签
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'ignored')),

  -- 管理信息
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_feature_type ON ai_feedbacks(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_status ON ai_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_timestamp ON ai_feedbacks(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_session_id ON ai_feedbacks(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_ai_request_id ON ai_feedbacks(ai_request_id);

-- AI分析结果表
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  feedback_id UUID REFERENCES ai_feedbacks(id) ON DELETE CASCADE,
  request_id UUID REFERENCES ai_requests(id) ON DELETE CASCADE,

  -- 分析结果
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  keywords TEXT[], -- 关键词提取
  categories TEXT[], -- 自动分类标签
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),

  -- 自动生成的建议
  suggestions TEXT[],

  -- 分析元数据
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analysis_model VARCHAR(100) DEFAULT 'basic_rule_based',
  processing_time_ms INTEGER,
  version VARCHAR(20) DEFAULT '1.0',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_analyses_feedback_id ON ai_analyses(feedback_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_sentiment ON ai_analyses(sentiment);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_analyzed_at ON ai_analyses(analyzed_at);

-- AI性能统计表
CREATE TABLE IF NOT EXISTS ai_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 统计维度
  stat_date DATE NOT NULL, -- 统计日期
  ai_provider VARCHAR(50) NOT NULL DEFAULT 'deepseek',
  feature_type VARCHAR(50) NOT NULL,
  model_name VARCHAR(100),

  -- 请求统计
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  -- 性能统计
  avg_response_time_ms DECIMAL(10,2),
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,

  -- Token统计
  total_tokens INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,

  -- 成本统计（假设每百万token的成本）
  estimated_cost DECIMAL(10,6) DEFAULT 0,

  -- 错误统计
  error_rates JSONB, -- 各类错误的发生率

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 确保每个日期、提供商、功能类型、模型组合唯一
  UNIQUE(stat_date, ai_provider, feature_type, model_name)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_performance_stats_date ON ai_performance_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_ai_performance_stats_feature_type ON ai_performance_stats(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_performance_stats_ai_provider ON ai_performance_stats(ai_provider);

-- AI模板配置表
CREATE TABLE IF NOT EXISTS ai_feedback_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  name VARCHAR(200) NOT NULL,
  description TEXT,
  feature_type VARCHAR(50) NOT NULL,
  feedback_type VARCHAR(50) NOT NULL,

  -- 模板配置
  config JSONB NOT NULL, -- 模板配置

  -- 显示配置
  display JSONB NOT NULL, -- 显示配置

  -- 状态
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- 元数据
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_feedback_templates_feature_type ON ai_feedback_templates(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_templates_is_active ON ai_feedback_templates(is_active);

-- AI会话记录表
CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 会话信息
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,

  -- 会话统计
  total_requests INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  avg_response_time_ms DECIMAL(10,2),

  -- 会话上下文
  context JSONB, -- 会话上下文信息

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_sessions_session_id ON ai_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_start_time ON ai_sessions(start_time);

-- RLS (Row Level Security) 策略
-- AI反馈表
ALTER TABLE ai_feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all AI feedbacks" ON ai_feedbacks FOR SELECT USING (true);
CREATE POLICY "Users can insert AI feedbacks" ON ai_feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update AI feedbacks" ON ai_feedbacks FOR UPDATE USING (true);
CREATE POLICY "Admins can delete AI feedbacks" ON ai_feedbacks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- AI请求表
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view AI requests" ON ai_requests FOR SELECT USING (true);
CREATE POLICY "System can insert AI requests" ON ai_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update AI requests" ON ai_requests FOR UPDATE USING (true);

-- AI分析结果表
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view AI analyses" ON ai_analyses FOR SELECT USING (true);
CREATE POLICY "System can insert AI analyses" ON ai_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update AI analyses" ON ai_analyses FOR UPDATE USING (true);

-- AI性能统计表
ALTER TABLE ai_performance_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view AI performance stats" ON ai_performance_stats FOR SELECT USING (true);
CREATE POLICY "System can manage AI performance stats" ON ai_performance_stats FOR ALL USING (true);

-- AI模板表
ALTER TABLE ai_feedback_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view AI templates" ON ai_feedback_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage AI templates" ON ai_feedback_templates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- AI会话表
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sessions" ON ai_sessions FOR ALL USING (
  user_id IS NULL OR user_id = auth.uid()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_feedbacks_updated_at BEFORE UPDATE ON ai_feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_requests_updated_at BEFORE UPDATE ON ai_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_analyses_updated_at BEFORE UPDATE ON ai_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_performance_stats_updated_at BEFORE UPDATE ON ai_performance_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_feedback_templates_updated_at BEFORE UPDATE ON ai_feedback_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建聚合性能统计的函数
CREATE OR REPLACE FUNCTION aggregate_ai_performance_stats()
RETURNS void AS $$
BEGIN
  -- 按日期、提供商、功能类型、模型聚合性能统计
  INSERT INTO ai_performance_stats (
    stat_date, ai_provider, feature_type, model_name,
    total_requests, successful_requests, failed_requests,
    avg_response_time_ms, min_response_time_ms, max_response_time_ms,
    total_tokens, input_tokens, output_tokens,
    estimated_cost
  )
  SELECT
    DATE(timestamp) as stat_date,
    ai_provider,
    feature_type,
    COALESCE(model_name, 'default') as model_name,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
    COUNT(*) FILTER (WHERE status = 'error') as failed_requests,
    ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
    MIN(response_time_ms) as min_response_time_ms,
    MAX(response_time_ms) as max_response_time_ms,
    COALESCE(SUM((tokens_used->>'total')::integer), 0) as total_tokens,
    COALESCE(SUM((tokens_used->>'input')::integer), 0) as input_tokens,
    COALESCE(SUM((tokens_used->>'output')::integer), 0) as output_tokens,
    COALESCE(SUM((tokens_used->>'total')::integer) * 0.002, 0) as estimated_cost -- 假设每100万token成本2元
  FROM ai_requests
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days' -- 只聚合最近7天的数据
    AND timestamp < CURRENT_DATE -- 不包括今天的数据（今天的数据实时计算）
  GROUP BY DATE(timestamp), ai_provider, feature_type, COALESCE(model_name, 'default')
  ON CONFLICT (stat_date, ai_provider, feature_type, model_name)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    min_response_time_ms = EXCLUDED.min_response_time_ms,
    max_response_time_ms = EXCLUDED.max_response_time_ms,
    total_tokens = EXCLUDED.total_tokens,
    input_tokens = EXCLUDED.input_tokens,
    output_tokens = EXCLUDED.output_tokens,
    estimated_cost = EXCLUDED.estimated_cost,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 创建定期聚合性能统计的函数（需要设置cron job）
CREATE OR REPLACE FUNCTION update_daily_ai_stats()
RETURNS void AS $$
BEGIN
  PERFORM aggregate_ai_performance_stats();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. AI反馈模板数据
-- ========================================

-- 插入默认的AI反馈模板
INSERT INTO ai_feedback_templates (
  name,
  description,
  feature_type,
  feedback_type,
  config,
  display,
  is_active,
  version
) VALUES
(
  '支出预测反馈模板',
  '用于收集用户对AI支出预测功能的反馈',
  'spending-prediction',
  'rating',
  '{"showRating": true, "showComment": true, "ratingScale": 5}',
  '{"title": "预测准确性评估", "description": "请评估AI预测的准确性如何？"}',
  true,
  1
),
(
  '异常检测反馈模板',
  '用于收集用户对异常检测功能的反馈',
  'anomaly-detection',
  'rating',
  '{"showRating": true, "showComment": true, "ratingScale": 5}',
  '{"title": "异常检测效果评估", "description": "异常检测功能是否准确识别了异常支出？"}',
  true,
  1
),
(
  '预算建议反馈模板',
  '用于收集用户对预算建议功能的反馈',
  'budget-recommendation',
  'rating',
  '{"showRating": true, "showComment": true, "ratingScale": 5}',
  '{"title": "预算建议实用性评估", "description": "AI提供的预算建议对您有帮助吗？"}',
  true,
  1
),
(
  '综合分析反馈模板',
  '用于收集用户对综合分析功能的反馈',
  'comprehensive-analysis',
  'rating',
  '{"showRating": true, "showComment": true, "ratingScale": 5}',
  '{"title": "综合分析效果评估", "description": "综合分析功能是否提供了有价值的洞察？"}',
  true,
  1
) ON CONFLICT DO NOTHING; -- 避免重复插入

-- ========================================
-- 8. 定时任务设置（可选）
-- ========================================

/*
-- 注意：以下cron任务需要在启用pg_cron扩展后才能使用
-- 在Supabase控制台的Extensions中启用pg_cron扩展

-- 每天凌晨2点执行性能统计聚合
SELECT cron.schedule(
  'daily-ai-stats',
  '0 2 * * *', -- 每天凌晨2点 UTC时间
  'SELECT update_daily_ai_stats();'
);

-- 每周日凌晨3点清理30天前的会话数据
SELECT cron.schedule(
  'cleanup-old-sessions',
  '0 3 * * 0', -- 每周日凌晨3点 UTC时间
  $$
  DELETE FROM ai_sessions
  WHERE start_time < NOW() - INTERVAL '30 days'
  AND end_time IS NOT NULL;
  $$
);

-- 每月1号凌晨4点备份性能统计数据
SELECT cron.schedule(
  'backup-ai-data',
  '0 4 1 * *', -- 每月1号凌晨4点 UTC时间
  $$
  INSERT INTO ai_performance_stats_backup
  SELECT * FROM ai_performance_stats
  WHERE stat_date >= CURRENT_DATE - INTERVAL '1 month';
  $$
);
*/