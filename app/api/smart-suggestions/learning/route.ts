import { NextRequest } from 'next/server';
import { supabase } from '@/lib/clients/supabase/client';

export const runtime = 'nodejs';

/**
 * 智能建议学习数据收集 API
 * 用于收集用户对建议的选择和忽略行为，优化推荐算法
 */

type LearningData = {
  user_id?: string; // 未来扩展用户系统时使用
  session_id: string;
  event_type: 'suggestion_selected' | 'suggestion_ignored' | 'manual_input';
  timestamp: string;
  context: {
    category?: string;
    amount?: number;
    currency?: string;
    time_context?: string;
    partial_input?: string;
  };
  suggestion_data?: {
    suggestion_id: string;
    suggestion_type: string;
    content: string;
    confidence?: number;
    reason?: string;
  };
  ignored_suggestions?: Array<{
    suggestion_id: string;
    suggestion_type: string;
    content: string;
    confidence?: number;
  }>;
  final_input: string; // 用户最终输入的内容
  learning_outcome: 'positive' | 'negative' | 'neutral';
};

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();

    // 支持单条数据或批量数据
    if (requestBody.learning_data && Array.isArray(requestBody.learning_data)) {
      // 批量处理学习数据
      const { session_id, learning_data } = requestBody;

      if (!session_id || !learning_data || learning_data.length === 0) {
        return new Response(
          JSON.stringify({ error: '缺少必要的学习数据字段' }),
          { status: 400 }
        );
      }

      // 批量存储和处理
      for (const data of learning_data) {
        const completeData: LearningData = {
          ...data,
          session_id,
          timestamp: data.timestamp || new Date().toISOString()
        };

        await storeLearningData(completeData);
        void processLearningData(completeData);
      }

      return Response.json({ success: true, processed: learning_data.length });
    } else {
      // 单条数据处理（向后兼容）
      const data: LearningData = requestBody;

      if (!data.session_id || !data.final_input) {
        return new Response(
          JSON.stringify({ error: '缺少必要的学习数据字段' }),
          { status: 400 }
        );
      }

      await storeLearningData(data);
      void processLearningData(data);

      return Response.json({ success: true });
    }
  } catch (err: any) {
    console.error('学习数据收集失败:', err);
    return new Response(
      JSON.stringify({ error: err.message || '学习数据收集失败' }),
      { status: 500 }
    );
  }
}

/**
 * 存储学习数据
 */
async function storeLearningData(data: LearningData) {
  try {
    // 存储主要学习记录
    const { error: learningError } = await supabase
      .from('suggestion_learning_logs')
      .insert({
        session_id: data.session_id,
        event_type: data.event_type,
        timestamp: data.timestamp,
        context: data.context,
        suggestion_data: data.suggestion_data,
        ignored_suggestions: data.ignored_suggestions,
        final_input: data.final_input,
        learning_outcome: data.learning_outcome
      });

    if (learningError) {
      console.error('存储学习记录失败:', learningError);
    }

    // 更新常用备注的上下文标签和使用模式
    if (data.final_input && data.final_input.trim()) {
      await updateNoteContextData(data);
    }

  } catch (error) {
    console.error('存储学习数据时发生错误:', error);
  }
}

/**
 * 更新备注的上下文数据
 */
async function updateNoteContextData(data: LearningData) {
  try {
    const { context, final_input, learning_outcome } = data;

    // 查找或创建对应的备注记录
    const { data: existingNote, error: findError } = await supabase
      .from('common_notes')
      .select('*')
      .ilike('content', `%${final_input.trim()}%`)
      .limit(1);

    if (findError) {
      console.error('查找备注失败:', findError);
      return;
    }

    // 如果备注不存在且是正向学习结果，创建新备注
    if (!existingNote || existingNote.length === 0) {
      if (learning_outcome === 'positive') {
        await createNewNote(final_input, context, data.timestamp);
      }
      return;
    }

    const note = existingNote[0];

    // 更新使用次数和最后使用时间
    const updateData: any = {
      usage_count: note.usage_count + 1,
      last_used: data.timestamp
    };

    // 更新平均金额
    if (context.amount) {
      const currentAvg = note.avg_amount || 0;
      const newAvg = ((currentAvg * note.usage_count) + context.amount) / (note.usage_count + 1);
      updateData.avg_amount = Math.round(newAvg * 100) / 100;
    }

    // 更新类别关联度
    if (context.category && learning_outcome === 'positive') {
      // 如果当前使用上下文的类别与备注的关联类别不同，且使用频率较高，则更新关联类别
      if (note.category_affinity !== context.category && note.usage_count >= 3) {
        // 简单的频率统计，未来可以改进为更智能的算法
        updateData.category_affinity = context.category;
      }
    }

    // 更新上下文标签
    if (context.time_context && learning_outcome === 'positive') {
      const newContextTag = context.time_context;
      const currentTags = note.context_tags || [];

      if (!currentTags.includes(newContextTag)) {
        updateData.context_tags = [...currentTags, newContextTag];
      }
    }

    // 更新时间模式
    if (context.time_context && learning_outcome === 'positive') {
      const newTimePattern = extractTimePattern(context.time_context);
      const currentPatterns = note.time_patterns || [];

      if (newTimePattern && !currentPatterns.includes(newTimePattern)) {
        updateData.time_patterns = [...currentPatterns, newTimePattern];
      }
    }

    // 执行更新
    const { error: updateError } = await supabase
      .from('common_notes')
      .update(updateData)
      .eq('id', note.id);

    if (updateError) {
      console.error('更新备注数据失败:', updateError);
    }

  } catch (error) {
    console.error('更新备注上下文数据时发生错误:', error);
  }
}

/**
 * 创建新备注
 */
async function createNewNote(content: string, context: any, timestamp: string) {
  try {
    const newNote: any = {
      content: content.trim(),
      usage_count: 1,
      last_used: timestamp,
      created_at: timestamp,
      is_active: true
    };

    // 添加上下文信息
    if (context.amount) {
      newNote.avg_amount = context.amount;
    }

    if (context.category) {
      newNote.category_affinity = context.category;
    }

    if (context.time_context) {
      const timePattern = extractTimePattern(context.time_context);
      if (timePattern) {
        newNote.time_patterns = [timePattern];
      }

      const contextTag = context.time_context;
      newNote.context_tags = [contextTag];
    }

    const { error } = await supabase
      .from('common_notes')
      .insert(newNote);

    if (error) {
      console.error('创建新备注失败:', error);
    }

  } catch (error) {
    console.error('创建新备注时发生错误:', error);
  }
}

/**
 * 从时间上下文中提取时间模式
 */
function extractTimePattern(timeContext: string): string | null {
  // 提取时间模式的简单规则
  if (timeContext.includes('午餐')) {
    return '工作日12:00-13:00';
  }
  if (timeContext.includes('晚餐')) {
    return '晚间18:00-20:00';
  }
  if (timeContext.includes('早餐')) {
    return '早晨07:00-09:00';
  }
  if (timeContext.includes('工作时间')) {
    return '工作日09:00-18:00';
  }
  if (timeContext.includes('周末')) {
    return '周末时间';
  }
  if (timeContext.includes('夜间')) {
    return '夜间时间';
  }

  return null;
}

/**
 * 异步处理学习数据，优化推荐算法
 */
async function processLearningData(data: LearningData) {
  try {
    // 这里可以实现更复杂的学习算法
    // 例如：
    // 1. 调整不同类型建议的权重
    // 2. 优化置信度计算公式
    // 3. 识别用户的消费模式变化

    // 更新建议权重统计
    await updateSuggestionWeights(data);

  } catch (error) {
    console.error('处理学习数据时发生错误:', error);
  }
}

/**
 * 更新建议权重统计
 */
async function updateSuggestionWeights(data: LearningData) {
  try {
    if (data.event_type === 'suggestion_selected' && data.suggestion_data) {
      const { suggestion_type } = data.suggestion_data;

      // 更新该类型建议的成功统计
      const { error } = await supabase
        .from('suggestion_type_stats')
        .upsert({
          suggestion_type,
          total_usage: 1,
          success_count: data.learning_outcome === 'positive' ? 1 : 0,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'suggestion_type',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('更新建议类型统计失败:', error);
      }
    }

  } catch (error) {
    console.error('更新建议权重时发生错误:', error);
  }
}