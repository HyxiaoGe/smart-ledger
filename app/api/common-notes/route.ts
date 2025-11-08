// 常用备注API路由
import { NextRequest, NextResponse } from 'next/server';
import type { CommonNote } from '@/types/transaction';
import { supabaseServerClient } from '@/lib/clients/supabase/server';
import { unstable_cache, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

const supabase = supabaseServerClient;

const fetchCommonNotesCached = unstable_cache(
  async (searchValue: string | null, limitValue: number): Promise<CommonNote[]> => {
    let query = supabase
      .from('common_notes')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(limitValue);

    if (searchValue) {
      query = query.ilike('content', `%${searchValue}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data ?? [];
  },
  ['common-notes'],
  { revalidate: 60, tags: ['common-notes'] }
);

// GET - 获取常用备注列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 50)) : 10;

    const trimmedSearch = search?.trim() || null;
    const data = await fetchCommonNotesCached(trimmedSearch, limit);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 创建或更新常用备注
export async function POST(request: NextRequest) {
  try {
    const { content, amount, category, time_context } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const trimmedContent = content.trim();

    // 检查是否已存在相同内容的备注
    const { data: existingNote, error: fetchError } = await supabase
      .from('common_notes')
      .select('*')
      .eq('content', trimmedContent)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to check existing note' }, { status: 500 });
    }

    if (existingNote) {
      // 更新现有备注的使用次数和最后使用时间，同时更新智能字段
      const updateData: any = {
        usage_count: existingNote.usage_count + 1,
        last_used: new Date().toISOString()
      };

      // 更新平均金额
      if (amount) {
        const currentAvg = existingNote.avg_amount || 0;
        const newAvg = ((currentAvg * existingNote.usage_count) + amount) / (existingNote.usage_count + 1);
        updateData.avg_amount = Math.round(newAvg * 100) / 100;
      }

      // 更新类别关联度（如果提供了类别）
      if (category && existingNote.usage_count >= 3) {
        // 当使用次数较多时，更新类别关联度
        updateData.category_affinity = category;
      }

      // 更新上下文标签
      if (time_context) {
        const currentTags = existingNote.context_tags || [];
        if (!currentTags.includes(time_context)) {
          updateData.context_tags = [...currentTags, time_context];
        }
      }

      const { data: updatedNote, error: updateError } = await supabase
        .from('common_notes')
        .update(updateData)
        .eq('id', existingNote.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update common note' }, { status: 500 });
      }

      // 异步更新AI分析数据（不阻塞响应）
      if (amount) {
        void updateAnalytics(existingNote.id, amount);
      }

      revalidateTag('common-notes');
      return NextResponse.json({ data: updatedNote });
    } else {
      // 创建新备注，包含智能字段
      const newNoteData: any = {
        content: trimmedContent,
        usage_count: 1,
        last_used: new Date().toISOString()
      };

      // 添加智能字段
      if (amount) {
        newNoteData.avg_amount = amount;
      }

      if (category) {
        newNoteData.category_affinity = category;
      }

      if (time_context) {
        newNoteData.context_tags = [time_context];
      }

      const { data: newNote, error: insertError } = await supabase
        .from('common_notes')
        .insert(newNoteData)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create common note' }, { status: 500 });
      }

      // 异步创建AI分析数据（不阻塞响应）
      if (amount) {
        void createAnalytics(newNote.id, amount);
      }

      revalidateTag('common-notes');
      return NextResponse.json({ data: newNote });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 异步函数：更新AI分析数据
async function updateAnalytics(noteId: string, amount: number) {
  try {
    const { data: existingAnalytics } = await supabase
      .from('note_analytics')
      .select('*')
      .eq('note_id', noteId)
      .maybeSingle();

    if (existingAnalytics) {
      // 更新现有分析数据
      const newTypicalAmount = existingAnalytics.typical_amount
        ? (existingAnalytics.typical_amount + amount) / 2
        : amount;

      await supabase
        .from('note_analytics')
        .update({
          typical_amount: newTypicalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('note_id', noteId);
    } else {
      // 创建新的分析数据
      await supabase.from('note_analytics').insert({
        note_id: noteId,
        typical_amount: amount,
        confidence_score: 0.5 // 初始置信度
      });
    }
  } catch {
    // ignore analytics update failures
  }
}

// 异步函数：创建AI分析数据
async function createAnalytics(noteId: string, amount: number) {
  try {
    await supabase.from('note_analytics').insert({
      note_id: noteId,
      typical_amount: amount,
      confidence_score: 0.5 // 初始置信度
    });
  } catch {
    // ignore analytics creation failures
  }
}
