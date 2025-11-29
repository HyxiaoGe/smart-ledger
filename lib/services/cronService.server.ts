import { prisma } from '@/lib/clients/db/prisma';

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
  try {
    const jobs = await prisma.$queryRaw<CronJob[]>`
      SELECT
        jobid,
        schedule,
        command,
        nodename,
        nodeport,
        database,
        username,
        active,
        jobname
      FROM cron.job
      ORDER BY jobid
    `;
    return jobs || [];
  } catch (error) {
    console.error('获取 Cron 任务列表失败:', error);
    throw error;
  }
}

/**
 * 获取任务执行历史
 */
export async function getCronJobHistory(jobId?: number, limit = 50): Promise<CronJobRun[]> {
  try {
    if (jobId) {
      const history = await prisma.$queryRaw<CronJobRun[]>`
        SELECT
          runid,
          jobid,
          job_pid,
          database,
          username,
          command,
          status,
          return_message,
          start_time::text,
          end_time::text
        FROM cron.job_run_details
        WHERE jobid = ${jobId}
        ORDER BY start_time DESC
        LIMIT ${limit}
      `;
      return history || [];
    } else {
      const history = await prisma.$queryRaw<CronJobRun[]>`
        SELECT
          runid,
          jobid,
          job_pid,
          database,
          username,
          command,
          status,
          return_message,
          start_time::text,
          end_time::text
        FROM cron.job_run_details
        ORDER BY start_time DESC
        LIMIT ${limit}
      `;
      return history || [];
    }
  } catch (error) {
    console.error('获取执行历史失败:', error);
    throw error;
  }
}

/**
 * 获取任务统计信息
 */
export async function getCronJobStats(): Promise<CronJobStats[]> {
  try {
    const stats = await prisma.$queryRaw<CronJobStats[]>`
      SELECT
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        COALESCE(s.total_runs, 0)::int as total_runs,
        COALESCE(s.success_count, 0)::int as success_count,
        COALESCE(s.failed_count, 0)::int as failed_count,
        s.last_run_time::text
      FROM cron.job j
      LEFT JOIN (
        SELECT
          jobid,
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'succeeded') as success_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          MAX(start_time) as last_run_time
        FROM cron.job_run_details
        GROUP BY jobid
      ) s ON j.jobid = s.jobid
      ORDER BY j.jobid
    `;
    return stats || [];
  } catch (error) {
    console.error('获取任务统计失败:', error);
    throw error;
  }
}

/**
 * 创建 Cron 任务
 */
export async function createCronJob(
  jobName: string,
  schedule: string,
  command: string
): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ schedule: number }]>`
      SELECT cron.schedule(${jobName}, ${schedule}, ${command}) as schedule
    `;
    return result[0]?.schedule || 0;
  } catch (error) {
    console.error('创建 Cron 任务失败:', error);
    throw error;
  }
}

/**
 * 删除 Cron 任务
 */
export async function deleteCronJob(jobName: string): Promise<boolean> {
  try {
    await prisma.$queryRaw`
      SELECT cron.unschedule(${jobName})
    `;
    return true;
  } catch (error) {
    console.error('删除 Cron 任务失败:', error);
    throw error;
  }
}

/**
 * 解析 Cron 表达式为人类可读格式
 */
export function parseCronExpression(cronExp: string): string {
  const parts = cronExp.split(' ');

  if (parts.length !== 5) {
    return cronExp;
  }

  const [minute, hour, day, month, weekday] = parts;

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

  let description = '';

  if (weekday !== '*') {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    description += `每${days[parseInt(weekday)]} `;
  } else if (day !== '*') {
    description += `每月${day}号 `;
  } else if (month === '*' && day === '*') {
    description += '每天 ';
  }

  const h = hour === '*' ? '每小时' : hour.padStart(2, '0');
  const m = minute === '*' ? '' : `:${minute.padStart(2, '0')}`;

  if (hour !== '*') {
    description += `${h}${m}`;
  }

  return description.trim() || cronExp;
}

/**
 * 计算下次执行时间
 */
export function calculateNextRun(cronExp: string): Date | null {
  try {
    const now = new Date();
    const parts = cronExp.split(' ');

    if (parts.length !== 5) {
      return null;
    }

    const [minute, hour, day, month, weekday] = parts;
    const targetHour = parseInt(hour);
    const targetMinute = parseInt(minute);

    if (day === '*' && month === '*' && weekday === '*') {
      const next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    if (weekday !== '*') {
      const targetWeekday = parseInt(weekday);
      const next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);
      const currentWeekday = next.getDay();
      let daysUntilTarget = targetWeekday - currentWeekday;
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      next.setDate(next.getDate() + daysUntilTarget);
      return next;
    }

    if (day !== '*' && month === '*' && weekday === '*') {
      const targetDay = parseInt(day);
      const next = new Date(now);
      next.setDate(targetDay);
      next.setHours(targetHour, targetMinute, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    }

    return null;
  } catch (error) {
    console.error('计算下次执行时间失败:', error);
    return null;
  }
}

/**
 * 获取任务描述
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
    'generate-weekly-report': {
      title: '每周消费报告',
      description: '基于用户消费记录自动生成每周消费分析报告',
      category: 'ai'
    },
    'cleanup-old-logs': {
      title: '清理旧日志',
      description: '清理超过30天的日志记录',
      category: 'maintenance'
    },
  };

  return descriptions[jobName] || {
    title: jobName,
    description: '未知任务',
    category: 'other'
  };
}
