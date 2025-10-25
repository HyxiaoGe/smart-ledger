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