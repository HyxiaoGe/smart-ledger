import { NextRequest } from 'next/server';
import { chat } from '@/lib/clients/ai/client';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/utils/apiErrorHandler';
import { createRequestLogger, startPerformanceMeasure } from '@/lib/core/logger';

export const runtime = 'nodejs';

// 验证 schema
const analyzeSchema = z.object({
  month: commonSchemas.month,
  transactions: z.array(z.any()).min(1, { message: 'At least one transaction is required' }),
  currency: commonSchemas.currency.optional()
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const log = createRequestLogger('/api/analyze', req);
  const measure = startPerformanceMeasure();

  log.info('AI分析请求开始');
  const body = await req.json();

  // 验证输入
  const validation = validateRequest(analyzeSchema, body);
  if (!validation.success) {
    log.warn('请求参数验证失败');
    return validation.response;
  }

  const { month, transactions } = validation.data;

  log.info({
    month,
    transactionCount: transactions.length,
    currency: transactions?.[0]?.currency
  }, '开始执行AI分析');

  const sys = `你是一名中文财务助理。请严格按以下 Markdown 模板输出（每段之间空一行，不要使用代码块或表格）。仅关注"支出"，不要输出收入与结余：\n\n---\n### 📊 本期支出概览\n- 本期总支出：{千分位金额} {币种}\n\n---\n### 🔝 三大支出类别\n1. 类别：金额 {币种}（占比x%）\n2. 类别：金额 {币种}（占比x%）\n3. 类别：金额 {币种}（占比x%）\n\n---\n### 📈 与上期变化（支出）\n- 简述支出较上期的变化（若无上期数据则说明原因）\n\n---\n### 💡 简短建议\n- 两条以内可执行建议\n`;

  const user = `币种: ${transactions?.[0]?.currency || 'CNY'}\n月份: ${month}\n数据(JSON): ${JSON.stringify(transactions).slice(0, 4000)}`; // 控制长度，避免过长

  const summary = await chat([
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ]);

  log.info({
    ...measure(),
    summaryLength: summary.length
  }, 'AI分析完成');

  return Response.json({ summary });
});
