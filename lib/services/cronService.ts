import { supabase } from '@/lib/clients/supabase/client';

/**
 * Cron 任务定义
 */
export interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

/**
 * Cron 任务执行记录
 */
export interface CronJobRun {
  runid: number;
  jobid: number;
  job_pid: number;
  database: string;
  username: string;
  command: string;
  status: 'succeeded' | 'failed' | 'running';
  return_message: string;
  start_time: string;
  end_time: string | null;
}

/**
 * 任务统计信息
 */
export interface CronJobStats {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  total_runs: number;
  success_count: number;
  failed_count: number;
  last_run_time: string | null;
  next_run_time?: string;
}

/**
 * 获取所有 Cron 任务列表
 */
export async function getAllCronJobs(): Promise<CronJob[]> {
  const { data, error } = await supabase
    .rpc('get_cron_jobs');

  if (error) {
    console.error('获取 Cron 任务列表失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取任务执行历史
 */
export async function getCronJobHistory(jobId?: number, limit = 50): Promise<CronJobRun[]> {
  const { data, error } = await supabase
    .rpc('get_cron_job_history', {
      p_job_id: jobId || null,
      p_limit: limit
    });

  if (error) {
    console.error('获取执行历史失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取任务统计信息
 */
export async function getCronJobStats(): Promise<CronJobStats[]> {
  const { data, error } = await supabase
    .rpc('get_cron_job_stats');

  if (error) {
    console.error('获取任务统计失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取今日任务汇总
 */
export async function getTodayCronSummary(): Promise<{
  total_runs: number;
  success_count: number;
  failed_count: number;
  running_count: number;
}> {
  const { data, error } = await supabase
    .rpc('get_today_cron_summary');

  if (error) {
    console.error('获取今日任务汇总失败:', error);
    throw error;
  }

  return data?.[0] || {
    total_runs: 0,
    success_count: 0,
    failed_count: 0,
    running_count: 0,
  };
}

/**
 * 手动触发任务（根据任务名称调用对应函数）
 */
export async function manualTriggerCronJob(jobName: string): Promise<any> {
  // 根据任务名称映射到对应的 RPC 函数
  const functionMap: Record<string, string> = {
    'generate-recurring-transactions': 'generate_recurring_transactions',
    'aggregate-ai-performance-stats': 'aggregate_ai_performance_stats',
    'cleanup-old-sessions': 'cleanup_old_sessions',
    'extract-daily-features': 'extract_ai_features_daily',
    'annotate-patterns': 'annotate_consumption_patterns',
    'export-training-snapshot': 'snapshot_training_data',
    'check-data-quality': 'check_data_quality',
    'refresh-budget-suggestions-daily': 'refresh_budget_suggestions',
  };

  const functionName = functionMap[jobName];

  if (!functionName) {
    throw new Error(`未知的任务: ${jobName}`);
  }

  const { data, error } = await supabase.rpc(functionName);

  if (error) {
    console.error(`手动触发任务 ${jobName} 失败:`, error);
    throw error;
  }

  return data;
}

/**
 * 解析 Cron 表达式为人类可读格式
 */
export function parseCronExpression(cronExp: string): string {
  // 简单的 cron 表达式解析
  // 格式: 分 时 日 月 周
  const parts = cronExp.split(' ');

  if (parts.length !== 5) {
    return cronExp; // 无法解析，返回原始表达式
  }

  const [minute, hour, day, month, weekday] = parts;

  // 精确匹配常见模式
  const patterns: Record<string, string> = {
    '1 0 * * *': '每天 00:01',
    '0 1 * * *': '每天 01:00',
    '30 1 * * *': '每天 01:30',
    '0 2 * * *': '每天 02:00',
    '0 3 * * *': '每天 03:00',
    '0 3 * * 0': '每周日 03:00',
    '0 2 * * 0': '每周日 02:00',
    '0 0 * * 0': '每周日 00:00',
    '0 3 1 * *': '每月1号 03:00',
  };

  if (patterns[cronExp]) {
    return patterns[cronExp];
  }

  // 通用解析
  let description = '';

  // 周
  if (weekday !== '*') {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    description += `每${days[parseInt(weekday)]} `;
  }
  // 月
  else if (day !== '*') {
    description += `每月${day}号 `;
  }
  // 日
  else if (month === '*' && day === '*') {
    description += '每天 ';
  }

  // 时间
  const h = hour === '*' ? '每小时' : hour.padStart(2, '0');
  const m = minute === '*' ? '' : `:${minute.padStart(2, '0')}`;

  if (hour !== '*') {
    description += `${h}${m}`;
  }

  return description.trim() || cronExp;
}

/**
 * 计算下次执行时间（简化版本）
 * 注意：这是近似计算，实际执行时间由 pg_cron 决定
 */
export function calculateNextRun(cronExp: string, lastRun?: string): Date | null {
  try {
    const now = new Date();
    const parts = cronExp.split(' ');

    if (parts.length !== 5) {
      return null;
    }

    const [minute, hour, day, month, weekday] = parts;

    // 解析时间
    const targetHour = parseInt(hour);
    const targetMinute = parseInt(minute);

    // 处理每日任务 (day = *, month = *, weekday = *)
    if (day === '*' && month === '*' && weekday === '*') {
      const next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);

      // 如果今天的执行时间已过，移到明天
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      return next;
    }

    // 处理每周任务 (weekday != *)
    if (weekday !== '*') {
      const targetWeekday = parseInt(weekday); // 0 = 周日, 1 = 周一, ..., 6 = 周六
      const next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);

      // 计算距离目标星期几还有多少天
      const currentWeekday = next.getDay();
      let daysUntilTarget = targetWeekday - currentWeekday;

      // 如果目标是今天但时间已过，或者目标已过，移到下周
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }

      next.setDate(next.getDate() + daysUntilTarget);
      return next;
    }

    // 处理每月任务 (day != *)
    if (day !== '*' && month === '*' && weekday === '*') {
      const targetDay = parseInt(day);
      const next = new Date(now);
      next.setDate(targetDay);
      next.setHours(targetHour, targetMinute, 0, 0);

      // 如果这个月的执行时间已过，移到下个月
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }

      return next;
    }

    return null; // 更复杂的表达式暂不支持
  } catch (error) {
    console.error('计算下次执行时间失败:', error);
    return null;
  }
}

/**
 * 获取任务描述（友好名称）
 */
export function getJobDescription(jobName: string): { title: string; description: string; category: string } {
  const descriptions: Record<string, { title: string; description: string; category: string }> = {
    'generate-recurring-transactions': {
      title: '固定账单生成',
      description: '自动生成符合条件的固定支出交易记录',
      category: 'business'
    },
    'aggregate-ai-performance-stats': {
      title: 'AI性能统计',
      description: '汇总AI分析的性能数据和使用情况',
      category: 'ai'
    },
    'cleanup-old-sessions': {
      title: '清理过期会话',
      description: '定期清理过期的用户会话和临时数据',
      category: 'maintenance'
    },
    'extract-daily-features': {
      title: 'AI特征提取',
      description: '每日提取交易特征用于机器学习训练',
      category: 'ai'
    },
    'annotate-patterns': {
      title: '消费模式标注',
      description: '分析并标注用户的消费行为模式',
      category: 'ai'
    },
    'export-training-snapshot': {
      title: '训练数据快照',
      description: '定期导出训练数据快照供模型使用',
      category: 'ai'
    },
    'check-data-quality': {
      title: '数据质量检查',
      description: '检查数据完整性、一致性和异常情况',
      category: 'maintenance'
    },
    'refresh-budget-suggestions-daily': {
      title: '预算建议刷新',
      description: '每日刷新AI生成的预算建议和消费洞察',
      category: 'ai'
    },
  };

  return descriptions[jobName] || {
    title: jobName,
    description: '未知任务',
    category: 'other'
  };
}
