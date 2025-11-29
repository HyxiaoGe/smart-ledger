/**
 * Cron 服务 - 客户端版本
 * 仅包含类型定义和工具函数
 * 数据库操作请使用 cronService.server.ts
 */

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

    // 解析时间，处理特殊语法如 */15
    const parseField = (field: string): number | null => {
      if (field === '*') return null;
      if (field.includes('/')) {
        // 处理 */n 语法，返回下一个匹配值
        return null; // 暂时返回 null，让下面的逻辑处理
      }
      const num = parseInt(field);
      return isNaN(num) ? null : num;
    };

    const targetHour = parseField(hour);
    const targetMinute = parseField(minute);

    // 处理每小时任务 (hour = *, minute = */n 或具体值)
    if (hour === '*' || hour.includes('/')) {
      const next = new Date(now);

      if (minute.includes('/')) {
        // 每隔N分钟执行，如 */15
        const interval = parseInt(minute.split('/')[1]) || 15;
        const currentMinute = next.getMinutes();
        const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;

        if (nextMinute >= 60) {
          next.setHours(next.getHours() + 1);
          next.setMinutes(0, 0, 0);
        } else {
          next.setMinutes(nextMinute, 0, 0);
        }
      } else if (targetMinute !== null) {
        next.setMinutes(targetMinute, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
      }

      return next;
    }

    // 如果 hour 或 minute 无法解析为数字，返回 null
    if (targetHour === null || targetMinute === null) {
      return null;
    }

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
      if (isNaN(targetWeekday)) return null;

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
      if (isNaN(targetDay)) return null;

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
    'generate-weekly-report': {
      title: '每周消费报告',
      description: '基于用户消费记录自动生成每周消费分析报告',
      category: 'ai'
    },
    'cleanup-old-logs': {
      title: '清理旧日志',
      description: '清理超过30天的日志记录',
      category: 'ai'
    },
  };

  return descriptions[jobName] || {
    title: jobName,
    description: '未知任务',
    category: 'other'
  };
}
