import { NextRequest } from 'next/server';
import { supabase } from '@/lib/clients/supabase/client';
import {
  type SmartSuggestionParams,
  type SmartSuggestionResponse,
  type SmartSuggestion,
  type CommonNote
} from '@/types/transaction';
import { generateTimeContext, categorizeAmount, generateConsumptionScenario } from '@/lib/domain/noteContext';
import { getPatternBasedSuggestions, matchConsumptionPattern } from '@/lib/services/smartPatterns';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';

export const runtime = 'nodejs';

// 验证 schema
const smartSuggestionsSchema = z.object({
  category: z.string().optional(),
  amount: z.number().optional(),
  currency: commonSchemas.currency.optional().default('CNY'),
  time_context: z.string().optional(),
  partial_input: z.string().optional().default(''),
  limit: z.number().int().positive().max(50).optional().default(5)
});

/**
 * 智能备注提示 API
 * 支持多种提示策略：频率、上下文、模式、相似性
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 验证输入
    const validation = validateRequest(smartSuggestionsSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const {
      category,
      amount,
      currency,
      time_context,
      partial_input,
      limit
    } = validation.data;

    // 生成当前时间上下文
    const currentTimeContext = time_context || generateTimeContext().label;

    // 获取智能提示
    const suggestions = await generateSmartSuggestions({
      category,
      amount,
      currency,
      time_context: currentTimeContext,
      partial_input,
      limit
    });

    // 获取传统备注作为后备
    const fallbackNotes = await getFallbackNotes(partial_input, limit);

    const response: SmartSuggestionResponse = {
      suggestions,
      fallback_notes: fallbackNotes
    };

    return Response.json(response);
  } catch (err: any) {
    console.error('智能提示生成失败:', err);
    return new Response(
      JSON.stringify({ error: err.message || '智能提示生成失败' }),
      { status: 500 }
    );
  }
}

/**
 * 生成智能提示
 */
async function generateSmartSuggestions(params: SmartSuggestionParams): Promise<SmartSuggestion[]> {
  const { category, amount, currency, time_context, partial_input, limit = 5 } = params;
  const suggestions: SmartSuggestion[] = [];

  // 🎯 优先使用基于真实历史数据的模式匹配
  if (category && amount) {
    const timeContext = generateTimeContext();
    const patternSuggestions = getPatternBasedSuggestions(category, amount, timeContext.label);

    // 转换为 SmartSuggestion 格式
    patternSuggestions.forEach((patternSuggestion, index) => {
      suggestions.push({
        id: `pattern-based-${index}`,
        content: patternSuggestion.note,
        type: 'pattern',
        confidence: patternSuggestion.confidence,
        reason: patternSuggestion.reason,
        source: '历史数据模式匹配',
        metadata: {
          avg_amount: amount,
          category,
          usage_count: Math.floor(patternSuggestion.confidence * 20) // 模拟使用次数
        }
      });
    });
  }

  // 1. 上下文感知提示（降级处理）
  if (category && amount && suggestions.length < 3) {
    const contextSuggestions = await generateContextSuggestions(params);
    suggestions.push(...contextSuggestions);
  }

  // 2. 传统模式匹配提示
  if (category && suggestions.length < 5) {
    const patternSuggestions = await generatePatternSuggestions(params);
    suggestions.push(...patternSuggestions);
  }

  // 3. 频率提示（基于使用频率但考虑上下文）
  if (suggestions.length < 7) {
    const frequencySuggestions = await generateFrequencySuggestions(params);
    suggestions.push(...frequencySuggestions);
  }

  // 4. 相似性提示
  if (amount && category && suggestions.length < 8) {
    const similaritySuggestions = await generateSimilaritySuggestions(params);
    suggestions.push(...similaritySuggestions);
  }

  // 去重并按置信度排序
  const uniqueSuggestions = deduplicateSuggestions(suggestions);
  return uniqueSuggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * 上下文感知提示
 */
async function generateContextSuggestions(params: SmartSuggestionParams): Promise<SmartSuggestion[]> {
  const { category, amount, currency, time_context, partial_input } = params;
  const suggestions: SmartSuggestion[] = [];

  try {
    // 查询匹配当前上下文的备注
    let query = supabase
      .from('common_notes')
      .select('*')
      .eq('is_active', true);

    // 如果有类别，优先匹配类别关联度
    if (category) {
      query = query.or(`category_affinity.eq.${category},category_affinity.is.null`);
    }

    // 如果有金额，匹配平均金额范围
    if (amount) {
      const amountRange = amount * 0.3; // 30% 浮动范围
      query = query.or(`avg_amount.gte.${amount - amountRange},avg_amount.lte.${amount + amountRange},avg_amount.is.null`);
    }

    // 如果有输入内容，进行内容匹配
    if (partial_input) {
      query = query.ilike('content', `%${partial_input}%`);
    }

    const { data: notes, error } = await query
      .order('usage_count', { ascending: false })
      .limit(10);

    if (error || !notes || notes.length === 0) {
      return suggestions;
    }

    // 为每个匹配的备注生成建议
    for (const note of notes) {
      const confidence = calculateContextConfidence(note, params);
      if (confidence > 0.3) { // 只保留置信度较高的建议
        suggestions.push({
          id: `context-${note.id}`,
          content: note.content,
          type: 'context',
          confidence,
          reason: generateContextReason(note, params),
          source: '智能上下文分析',
          metadata: {
            avg_amount: note.avg_amount,
            category: note.category_affinity,
            usage_count: note.usage_count,
            time_context: time_context
          }
        });
      }
    }
  } catch (error) {
    console.error('上下文提示生成失败:', error);
  }

  return suggestions;
}

/**
 * 模式匹配提示
 */
async function generatePatternSuggestions(params: SmartSuggestionParams): Promise<SmartSuggestion[]> {
  const { category, time_context, partial_input } = params;
  const suggestions: SmartSuggestion[] = [];

  try {
    // 基于时间模式匹配
    const timeContext = generateTimeContext();
    const timeTags = timeContext.tags;

    let query = supabase
      .from('common_notes')
      .select('*')
      .eq('is_active', true)
      .contains('context_tags', timeTags);

    if (category) {
      query = query.eq('category_affinity', category);
    }

    if (partial_input) {
      query = query.ilike('content', `%${partial_input}%`);
    }

    const { data: notes, error } = await query
      .order('usage_count', { ascending: false })
      .limit(8);

    if (error || !notes || notes.length === 0) {
      return suggestions;
    }

    for (const note of notes) {
      const confidence = calculatePatternConfidence(note, params, timeContext);
      if (confidence > 0.4) {
        suggestions.push({
          id: `pattern-${note.id}`,
          content: note.content,
          type: 'pattern',
          confidence,
          reason: generatePatternReason(note, timeContext),
          source: '时间模式识别',
          metadata: {
            avg_amount: note.avg_amount,
            category: note.category_affinity,
            usage_count: note.usage_count,
            time_context: timeContext.label
          }
        });
      }
    }
  } catch (error) {
    console.error('模式提示生成失败:', error);
  }

  return suggestions;
}

/**
 * 频率提示（增强版）
 */
async function generateFrequencySuggestions(params: SmartSuggestionParams): Promise<SmartSuggestion[]> {
  const { category, partial_input } = params;
  const suggestions: SmartSuggestion[] = [];

  try {
    let query = supabase
      .from('common_notes')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category_affinity', category);
    }

    if (partial_input) {
      query = query.ilike('content', `%${partial_input}%`);
    }

    const { data: notes, error } = await query
      .order('usage_count', { ascending: false })
      .limit(6);

    if (error || !notes || notes.length === 0) {
      return suggestions;
    }

    for (const note of notes) {
      // 频率提示的置信度主要基于使用次数
      const confidence = Math.min(note.usage_count / 20, 0.9); // 20次使用达到90%置信度

      suggestions.push({
        id: `frequency-${note.id}`,
        content: note.content,
        type: 'frequency',
        confidence,
        reason: `基于 ${note.usage_count} 次使用记录`,
        source: '使用频率统计',
        metadata: {
          usage_count: note.usage_count,
          category: note.category_affinity
        }
      });
    }
  } catch (error) {
    console.error('频率提示生成失败:', error);
  }

  return suggestions;
}

/**
 * 相似性提示
 */
async function generateSimilaritySuggestions(params: SmartSuggestionParams): Promise<SmartSuggestion[]> {
  const { category, amount } = params;
  const suggestions: SmartSuggestion[] = [];

  try {
    // 查询相似的交易记录来推断可能的备注
    const { data: similarTransactions, error } = await supabase
      .from('transactions')
      .select('note')
      .eq('category', category)
      .gte('amount', amount! * 0.8)
      .lte('amount', amount! * 1.2)
      .is('deleted_at', null)
      .not('note', 'is', null)
      .limit(20);

    if (error || !similarTransactions || similarTransactions.length === 0) {
      return suggestions;
    }

    // 统计备注出现频率
    const noteFrequency: Record<string, number> = {};
    similarTransactions.forEach(transaction => {
      if (transaction.note) {
        noteFrequency[transaction.note] = (noteFrequency[transaction.note] || 0) + 1;
      }
    });

    // 生成建议
    Object.entries(noteFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([note, frequency]) => {
        const confidence = Math.min(frequency / 10, 0.8);
        suggestions.push({
          id: `similarity-${note.replace(/[^a-zA-Z0-9]/g, '')}`,
          content: note,
          type: 'similarity',
          confidence,
          reason: `基于 ${frequency} 条相似金额的记录`,
          source: '相似交易分析',
          metadata: {
            avg_amount: amount
          }
        });
      });
  } catch (error) {
    console.error('相似性提示生成失败:', error);
  }

  return suggestions;
}

/**
 * 获取传统备注作为后备
 */
async function getFallbackNotes(partial_input: string, limit: number): Promise<CommonNote[]> {
  try {
    let query = supabase
      .from('common_notes')
      .select('*')
      .eq('is_active', true);

    if (partial_input) {
      query = query.ilike('content', `%${partial_input}%`);
    }

    const { data, error } = await query
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error('获取传统备注失败:', error);
    return [];
  }
}

/**
 * 计算上下文置信度
 */
function calculateContextConfidence(note: any, params: SmartSuggestionParams): number {
  let confidence = 0.3; // 基础置信度

  // 类别匹配度
  if (params.category && note.category_affinity === params.category) {
    confidence += 0.3;
  }

  // 金额匹配度
  if (params.amount && note.avg_amount) {
    const amountDiff = Math.abs(params.amount - note.avg_amount) / note.avg_amount;
    if (amountDiff < 0.2) {
      confidence += 0.3;
    } else if (amountDiff < 0.5) {
      confidence += 0.15;
    }
  }

  // 使用频率加权
  confidence += Math.min(note.usage_count / 30, 0.2);

  return Math.min(confidence, 0.95);
}

/**
 * 计算模式置信度
 */
function calculatePatternConfidence(note: any, params: SmartSuggestionParams, timeContext: any): number {
  let confidence = 0.4; // 基础置信度

  // 时间模式匹配度
  if (note.time_patterns && note.time_patterns.length > 0) {
    const currentTimeTag = timeContext.tags.join(' ');
    const hasTimeMatch = note.time_patterns.some((pattern: string) =>
      currentTimeTag.includes(pattern) || pattern.includes(currentTimeTag)
    );
    if (hasTimeMatch) {
      confidence += 0.3;
    }
  }

  // 类别匹配
  if (params.category && note.category_affinity === params.category) {
    confidence += 0.2;
  }

  // 使用频率
  confidence += Math.min(note.usage_count / 25, 0.15);

  return Math.min(confidence, 0.9);
}

/**
 * 生成上下文推荐理由
 */
function generateContextReason(note: any, params: SmartSuggestionParams): string {
  const reasons: string[] = [];

  if (params.category && note.category_affinity === params.category) {
    reasons.push(`匹配类别 "${params.category}"`);
  }

  if (params.amount && note.avg_amount) {
    const diff = Math.abs(params.amount - note.avg_amount);
    const percent = Math.round((diff / note.avg_amount) * 100);
    if (percent < 20) {
      reasons.push(`金额相近 (差异${percent}%)`);
    }
  }

  if (note.usage_count > 5) {
    reasons.push(`使用${note.usage_count}次`);
  }

  return reasons.join('，') || '基于历史数据分析';
}

/**
 * 生成模式推荐理由
 */
function generatePatternReason(note: any, timeContext: any): string {
  const reasons: string[] = [];

  if (note.context_tags && note.context_tags.length > 0) {
    reasons.push(`匹配当前时间模式`);
  }

  if (note.usage_count > 3) {
    reasons.push(`历史使用${note.usage_count}次`);
  }

  return reasons.join('，') || '基于时间模式分析';
}

/**
 * 去重建议
 */
function deduplicateSuggestions(suggestions: SmartSuggestion[]): SmartSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(suggestion => {
    const key = suggestion.content.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}