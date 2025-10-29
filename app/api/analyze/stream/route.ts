import { NextRequest } from 'next/server';
import { getAiConfig } from '@/lib/aiClient';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'edge';

const TEMPLATE = `你是一名中文财务助理。请严格按以下 Markdown 模板输出（每段之间空一行，不要使用代码块或表格）。仅关注“支出”，不要输出收入与结余：\n\n---\n### 📊 本期支出概览\n- 本期总支出：{千分位金额} {币种}\n\n---\n### 🔝 三大支出类别\n1. 类别：金额 {币种}（占比x%）\n2. 类别：金额 {币种}（占比x%）\n3. 类别：金额 {币种}（占比x%）\n\n---\n### 📈 与上期变化（支出）\n- 简述支出较上期的变化（若无上期数据则说明原因）\n\n---\n### 💡 简短建议\n- 两条以内可执行建议`;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no'
} as const;

export async function POST(req: NextRequest) {
  try {
    const { month, transactions, currency } = await req.json();
    const { conf } = getAiConfig();

    if (!conf.apiKey) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode('retry: 1000\n\n'));
      await writer.write(
        encoder.encode(`data: （开发提示）未配置 AI API Key，返回占位分析结果。\n\n`)
      );
      await writer.close();
      return new Response(readable, { headers: SSE_HEADERS });
    }

    const user = `币种: ${currency || 'CNY'}\n月份: ${month}\n数据(JSON): ${JSON.stringify(transactions).slice(0, 4000)}`;

    const upstream = await fetch(`${conf.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conf.apiKey}`
      },
      body: JSON.stringify({
        model: conf.model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: TEMPLATE },
          { role: 'user', content: user }
        ]
      })
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(`AI 请求失败：${upstream.status} ${text}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstream.body!.getReader();
    let buffer = '';
    const heartbeat = setInterval(() => {
      writer.write(encoder.encode(': hb\n\n'));
    }, 1000);

    (async () => {
      try {
        await writer.write(encoder.encode('retry: 1000\n\n'));
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.replace(/^data:\s*/, '');
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) await writer.write(encoder.encode(`data: ${delta}\n\n`));
            } catch {
              // 忽略无法解析的片段
            }
          }
        }
      } finally {
        clearInterval(heartbeat);
        await writer.write(encoder.encode('data: [END]\n\n'));
        await writer.close();
      }
    })();

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err: any) {
    return new Response(err?.message || '分析失败', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || '';
    const currency = searchParams.get('currency') || 'CNY';

    let rows: any[] = [];
    if (month) {
      const start = `${month}-01`;
      const endDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1);
      const end = endDate.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('transactions')
        .select('type, category, amount, date, currency, is_auto_generated, recurring_expense_id')
        .is('deleted_at', null)
        .is('is_auto_generated', false) // 过滤掉自动生成的交易记录
        .is('recurring_expense_id', null) // 过滤掉固定支出关联的交易记录
        .gte('date', start)
        .lt('date', end)
        .eq('currency', currency);
      if (error) throw error;
      rows = data || [];
    }

    const { conf } = getAiConfig();

    if (!conf.apiKey) {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('retry: 1000\n\n'));
          controller.enqueue(encoder.encode('data: （开发提示）未配置 AI API Key，返回占位分析结果。\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    const user = `币种: ${currency}\n月份: ${month}\n数据(JSON): ${JSON.stringify(rows).slice(0, 4000)}`;

    const upstream = await fetch(`${conf.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conf.apiKey}`
      },
      body: JSON.stringify({
        model: conf.model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: TEMPLATE },
          { role: 'user', content: user }
        ]
      })
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(`AI 请求失败：${upstream.status} ${text}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstream.body!.getReader();
    let buffer = '';
    const heartbeat = setInterval(() => {
      writer.write(encoder.encode(': hb\n\n'));
    }, 1000);

    (async () => {
      try {
        await writer.write(encoder.encode('retry: 1000\n\n'));
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.replace(/^data:\s*/, '');
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) await writer.write(encoder.encode(`data: ${delta}\n\n`));
            } catch {
              // 忽略无法解析的片段
            }
          }
        }
      } finally {
        clearInterval(heartbeat);
        await writer.write(encoder.encode('data: [END]\n\n'));
        await writer.close();
      }
    })();

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err: any) {
    return new Response(err?.message || '分析失败', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

