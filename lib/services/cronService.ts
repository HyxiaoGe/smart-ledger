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
 * 手动触发任务（根据任务名称调用对应函数）
 */
export async function manualTriggerCronJob(jobName: string): Promise<any> {
  // 根据任务名称映射到对应的 RPC 函数
  const functionMap: Record<string, string> = {
    'generate-recurring-transactions': 'generate_recurring_transactions',
    'extract-ai-features-daily': 'extract_ai_features_daily',
    'annotate-consumption-patterns': 'annotate_consumption_patterns',
    'snapshot-training-data-weekly': 'snapshot_training_data',
    'check-data-quality-daily': 'check_data_quality',
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

  // 常见模式识别
  if (cronExp === '1 0 * * *') {
    return '每天 00:01';
  }
  if (cronExp === '0 2 * * *') {
    return '每天 02:00';
  }
  if (cronExp === '0 0 * * 0') {
    return '每周日 00:00';
  }
  if (cronExp === '0 3 1 * *') {
    return '每月1号 03:00';
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
  const h = hour === '*' ? '每小时' : `${hour.padStart(2, '0')}`;
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
    const now = lastRun ? new Date(lastRun) : new Date();
    const parts = cronExp.split(' ');

    if (parts.length !== 5) {
      return null;
    }

    const [minute, hour, day, month, weekday] = parts;

    // 简化处理：只支持常见的每日任务
    if (cronExp === '1 0 * * *') {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 1, 0, 0);
      return next;
    }

    if (cronExp === '0 2 * * *') {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(2, 0, 0, 0);
      return next;
    }

    // 周任务
    if (cronExp === '0 0 * * 0') {
      const next = new Date(now);
      next.setDate(next.getDate() + (7 - next.getDay()));
      next.setHours(0, 0, 0, 0);
      return next;
    }

    return null; // 复杂表达式暂不支持
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
    'extract-ai-features-daily': {
      title: 'AI特征提取',
      description: '每日提取交易特征用于机器学习训练',
      category: 'ai'
    },
    'annotate-consumption-patterns': {
      title: '消费模式标注',
      description: '分析并标注用户的消费行为模式',
      category: 'ai'
    },
    'snapshot-training-data-weekly': {
      title: '训练数据快照',
      description: '每周保存训练数据快照供模型使用',
      category: 'ai'
    },
    'check-data-quality-daily': {
      title: '数据质量检查',
      description: '每日检查数据完整性和一致性',
      category: 'maintenance'
    },
  };

  return descriptions[jobName] || {
    title: jobName,
    description: '未知任务',
    category: 'other'
  };
}
