-- =====================================================
-- Cron 管理函数
-- 用于查询 pg_cron 系统表并展示定时任务信息
-- =====================================================

-- 1. 获取所有 Cron 任务列表
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
  jobid BIGINT,
  schedule TEXT,
  command TEXT,
  nodename TEXT,
  nodeport INTEGER,
  database TEXT,
  username TEXT,
  active BOOLEAN,
  jobname TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  ORDER BY j.jobid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 获取 Cron 任务执行历史
CREATE OR REPLACE FUNCTION get_cron_job_history(
  p_job_id BIGINT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  runid BIGINT,
  jobid BIGINT,
  job_pid INTEGER,
  database TEXT,
  username TEXT,
  command TEXT,
  status TEXT,
  return_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.runid,
    r.jobid,
    r.job_pid,
    r.database,
    r.username,
    r.command,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time
  FROM cron.job_run_details r
  WHERE (p_job_id IS NULL OR r.jobid = p_job_id)
  ORDER BY r.start_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 获取 Cron 任务统计信息
CREATE OR REPLACE FUNCTION get_cron_job_stats()
RETURNS TABLE (
  jobid BIGINT,
  jobname TEXT,
  schedule TEXT,
  active BOOLEAN,
  total_runs BIGINT,
  success_count BIGINT,
  failed_count BIGINT,
  last_run_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    COUNT(r.runid) as total_runs,
    COUNT(CASE WHEN r.status = 'succeeded' THEN 1 END) as success_count,
    COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_count,
    MAX(r.start_time) as last_run_time
  FROM cron.job j
  LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
  GROUP BY j.jobid, j.jobname, j.schedule, j.active
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 获取今日 Cron 任务执行汇总
CREATE OR REPLACE FUNCTION get_today_cron_summary()
RETURNS TABLE (
  total_runs BIGINT,
  success_count BIGINT,
  failed_count BIGINT,
  running_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_runs,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as success_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_count
  FROM cron.job_run_details
  WHERE start_time >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注释说明
COMMENT ON FUNCTION get_cron_jobs() IS '获取所有已调度的 Cron 任务列表';
COMMENT ON FUNCTION get_cron_job_history(BIGINT, INTEGER) IS '获取 Cron 任务执行历史记录';
COMMENT ON FUNCTION get_cron_job_stats() IS '获取 Cron 任务统计信息（执行次数、成功率等）';
COMMENT ON FUNCTION get_today_cron_summary() IS '获取今日 Cron 任务执行汇总数据';
