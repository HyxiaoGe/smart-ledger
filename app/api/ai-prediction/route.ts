import { NextRequest } from 'next/server';
import { supabase } from '@/lib/clients/supabase/client';
import { aiPredictionService, type TransactionPrediction, type QuickTransactionSuggestion } from '@/lib/services/aiPrediction';
import { generateTimeContext } from '@/lib/domain/noteContext';

export const runtime = 'nodejs';

/**
 * AI预测API
 * 支持多种预测类型：分类预测、金额预测、完整交易预测、快速记账建议
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...params } = body;

    switch (type) {
      case 'predict-category':
        return await handlePredictCategory(params);
      case 'predict-amount':
        return await handlePredictAmount(params);
      case 'predict-transaction':
        return await handlePredictTransaction(params);
      case 'quick-suggestions':
        return await handleQuickSuggestions(params);
      default:
        return new Response(
          JSON.stringify({ error: '不支持的预测类型' }),
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('AI预测失败:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'AI预测失败' }),
      { status: 500 }
    );
  }
}

/**
 * 预测分类
 */
async function handlePredictCategory(params: {
  amount: number;
  timeContext?: string;
}) {
  const { amount, timeContext } = params;

  if (!amount || amount <= 0) {
    return new Response(
      JSON.stringify({ error: '金额必须大于0' }),
      { status: 400 }
    );
  }

  const predictions = await aiPredictionService.predictCategory(amount, timeContext);

  return Response.json({
    type: 'category',
    amount,
    timeContext: timeContext || generateTimeContext().label,
    predictions
  });
}

/**
 * 预测金额
 */
async function handlePredictAmount(params: {
  category: string;
  timeContext?: string;
}) {
  const { category, timeContext } = params;

  if (!category) {
    return new Response(
      JSON.stringify({ error: '分类不能为空' }),
      { status: 400 }
    );
  }

  const predictions = await aiPredictionService.predictAmount(category, timeContext);

  return Response.json({
    type: 'amount',
    category,
    timeContext: timeContext || generateTimeContext().label,
    predictions
  });
}

/**
 * 预测完整交易
 */
async function handlePredictTransaction(params: {
  timeContext?: string;
  includeRecent?: boolean;
}) {
  const { timeContext, includeRecent = true } = params;

  let recentTransactions = [];

  if (includeRecent) {
    try {
      // 获取最近7天的交易记录
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', sevenDaysAgo.toISOString().slice(0, 10))
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(20);

      if (!error && data) {
        recentTransactions = data;
      }
    } catch (error) {
      console.error('获取最近交易失败:', error);
    }
  }

  const predictions = await aiPredictionService.predictTransaction({
    timeContext,
    recentTransactions
  });

  return Response.json({
    type: 'transaction',
    timeContext: timeContext || generateTimeContext().label,
    recentTransactionsCount: recentTransactions.length,
    predictions
  });
}

/**
 * 快速记账建议
 */
async function handleQuickSuggestions(params: {
  timeContext?: string;
}) {
  const { timeContext } = params;

  const suggestions = await aiPredictionService.generateQuickSuggestions(timeContext);

  return Response.json({
    type: 'quick-suggestions',
    timeContext: timeContext || generateTimeContext().label,
    suggestions
  });
}