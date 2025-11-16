-- 创建 system_logs 表用于统一日志记录
-- 支持多种日志类型：API请求、用户操作、错误、性能等

CREATE TABLE IF NOT EXISTS public.system_logs (
  -- 主键
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 日志分类
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  category text NOT NULL CHECK (category IN ('api_request', 'user_action', 'system', 'error', 'performance', 'security', 'data_sync')),
  message text NOT NULL,

  -- 追踪信息
  trace_id text,
  session_id text,
  operation_id text,

  -- 请求信息（用于 API 日志）
  method text,
  path text,
  status_code integer,
  ip_address text,
  user_agent text,

  -- 错误信息
  error_code text,
  error_stack text,

  -- 元数据（任意 JSON 数据）
  metadata jsonb,

  -- 性能指标
  duration_ms numeric,

  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON public.system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_trace_id ON public.system_logs(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_logs_operation_id ON public.system_logs(operation_id) WHERE operation_id IS NOT NULL;

-- 创建复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_system_logs_category_created_at ON public.system_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created_at ON public.system_logs(level, created_at DESC);

-- 启用行级安全 (RLS)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许插入日志（使用 service role key 或匿名用户都可以）
CREATE POLICY "允许插入日志" ON public.system_logs
  FOR INSERT
  WITH CHECK (true);

-- 创建策略：允许查询日志（演示环境开放查询，生产环境应该限制）
CREATE POLICY "允许查询日志" ON public.system_logs
  FOR SELECT
  USING (true);

-- 创建自动清理旧日志的函数（可选，保留最近30天的日志）
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.system_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE public.system_logs IS '系统统一日志表，记录 API 请求、用户操作、错误、性能等日志';
COMMENT ON COLUMN public.system_logs.level IS '日志级别：debug, info, warn, error, fatal';
COMMENT ON COLUMN public.system_logs.category IS '日志分类：api_request, user_action, system, error, performance, security, data_sync';
COMMENT ON COLUMN public.system_logs.metadata IS '元数据，存储额外的 JSON 数据';
