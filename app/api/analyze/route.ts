// AI 分析接口（中文注释）
// POST /api/analyze
// 入参：{ month: "YYYY-MM", transactions: Transaction[] }
// 出参：{ summary: string }

import { NextRequest } from 'next/server';
import { chat } from '@/lib/aiClient';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, transactions } = body || {};

    const sys = `你是一名中文财务助理。请严格按以下 Markdown 模板输出（每段之间空一行，不要使用代码块或表格）：\n\n---\n### 📊 本月财务概览\n- 总收入：{千分位金额} {币种}\n- 总支出：{千分位金额} {币种}\n- 结余：{千分位金额} {币种}\n\n---\n### 🔝 三大支出类别\n1. 类别：金额 {币种}（占比x%）\n2. 类别：金额 {币种}（占比x%）\n3. 类别：金额 {币种}（占比x%）\n\n---\n### 📈 与上月变化\n- 简述环比变化（若无上月数据则说明原因）\n\n---\n### 💡 简短建议\n- 两条以内可执行建议\n`;

    const user = `币种: ${(transactions?.[0]?.currency) || 'CNY'}\n月份: ${month}\n数据(JSON): ${JSON.stringify(transactions).slice(0, 4000)}`; // 控制长度，避免过长

    const summary = await chat([
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ]);

    return Response.json({ summary });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '分析失败' }), { status: 500 });
  }
}
