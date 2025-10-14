-- Supabase 数据库初始化脚本
-- 创建表、索引与匿名访问策略

-- 启用生成 UUID 的扩展
create extension if not exists pgcrypto;

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

-- 常用备注表
create table if not exists public.common_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  usage_count integer not null default 1,
  last_used timestamptz not null default now(),
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- 常用备注表索引
create index if not exists idx_common_notes_content on public.common_notes (content);
create index if not exists idx_common_notes_usage_count on public.common_notes (usage_count desc);
create index if not exists idx_common_notes_last_used on public.common_notes (last_used desc);
create index if not exists idx_common_notes_active on public.common_notes (is_active);

-- AI分析数据表（用户无感知）
create table if not exists public.note_analytics (
  note_id uuid references public.common_notes(id) on delete cascade,
  typical_amount numeric(12,2),
  preferred_time text,
  confidence_score numeric(3,2) default 0.0 check (confidence_score >= 0 and confidence_score <= 1),
  updated_at timestamptz not null default now(),
  primary key (note_id)
);

-- 行级安全策略：允许 anon 角色读写（演示用；生产请改为用户隔离）
alter table public.transactions enable row level security;
alter table public.common_notes enable row level security;
alter table public.note_analytics enable row level security;

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

-- 常用备注表的行级安全策略
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

-- AI分析表的行级安全策略
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
