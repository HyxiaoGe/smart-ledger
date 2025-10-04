-- Supabase 数据库初始化脚本（MVP）
-- 创建表、索引与匿名访问策略（用于无登录的本地/演示环境）

-- 启用生成 UUID 的扩展（Supabase 通常已启用 pgcrypto）
create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income','expense')),
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  note text,
  date date not null,
  currency text not null default 'CNY' check (currency in ('CNY','USD')),
  created_at timestamptz not null default now()
);

-- 常用索引
create index if not exists idx_transactions_date on public.transactions (date desc);
create index if not exists idx_transactions_type on public.transactions (type);
create index if not exists idx_transactions_category on public.transactions (category);

-- 行级安全策略：允许 anon 角色读写（演示用；生产请改为用户隔离）
alter table public.transactions enable row level security;

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

