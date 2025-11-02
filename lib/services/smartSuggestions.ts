import { fetchJson } from '@/lib/utils/http';
import type {
  SmartSuggestionParams,
  SmartSuggestionResponse,
  SmartSuggestion,
  CommonNote
} from '@/types/transaction';

export type { SmartSuggestionParams, SmartSuggestionResponse, SmartSuggestion };

const BASE_URL = '/api/smart-suggestions';

export const smartSuggestionsService = {
  /**
   * 获取智能备注建议
   */
  async getSuggestions(params: SmartSuggestionParams): Promise<SmartSuggestionResponse> {
    return fetchJson<SmartSuggestionResponse>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  /**
   * 记录用户选择了某个建议（用于学习和优化）
   */
  async recordSuggestionUsage(params: {
    suggestion_id: string;
    suggestion_type: string;
    content: string;
    context: {
      category?: string;
      amount?: number;
      currency?: string;
      time_context?: string;
    };
  }): Promise<void> {
    // 这里可以发送分析数据到后端，用于优化推荐算法
    // 暂时只在本地记录，未来可以扩展
  },

  /**
   * 记录用户忽略某个建议（用于优化）
   */
  async recordSuggestionIgnored(params: {
    suggestion_ids: string[];
    context: {
      category?: string;
      amount?: number;
      currency?: string;
      time_context?: string;
      partial_input?: string;
    };
  }): Promise<void> {
    // 记录被忽略的建议，用于调整推荐策略
  }
};

/**
 * 智能提示缓存管理
 */
export class SmartSuggestionsCache {
  private static instance: SmartSuggestionsCache;
  private cache = new Map<string, { data: SmartSuggestionResponse; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): SmartSuggestionsCache {
    if (!SmartSuggestionsCache.instance) {
      SmartSuggestionsCache.instance = new SmartSuggestionsCache();
    }
    return SmartSuggestionsCache.instance;
  }

  private generateCacheKey(params: SmartSuggestionParams): string {
    const { category, amount, currency, time_context, partial_input } = params;
    return `${category || 'no-cat'}-${amount || 'no-amt'}-${currency || 'CNY'}-${time_context || 'no-time'}-${partial_input || 'no-input'}`;
  }

  get(params: SmartSuggestionParams): SmartSuggestionResponse | null {
    const key = this.generateCacheKey(params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(params: SmartSuggestionParams, data: SmartSuggestionResponse): void {
    const key = this.generateCacheKey(params);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const smartSuggestionsCache = SmartSuggestionsCache.getInstance();

/**
 * 智能提示合并工具
 * 合并智能建议和传统备注，提供统一的提示列表
 */
export function mergeSuggestions(
  smartSuggestions: SmartSuggestion[],
  fallbackNotes: CommonNote[],
  maxTotal: number = 8
): Array<SmartSuggestion | CommonNote> {
  const result: Array<SmartSuggestion | CommonNote> = [];
  const seenContents = new Set<string>();

  // 首先添加高置信度的智能建议
  const highConfidenceSuggestions = smartSuggestions
    .filter(s => s.confidence >= 0.6)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.max(3, maxTotal / 2));

  for (const suggestion of highConfidenceSuggestions) {
    if (!seenContents.has(suggestion.content.toLowerCase())) {
      result.push(suggestion);
      seenContents.add(suggestion.content.toLowerCase());
    }
  }

  // 如果还有空间，添加传统备注
  const remainingSlots = maxTotal - result.length;
  if (remainingSlots > 0) {
    const topFallbackNotes = fallbackNotes
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, remainingSlots);

    for (const note of topFallbackNotes) {
      if (!seenContents.has(note.content.toLowerCase())) {
        result.push(note);
        seenContents.add(note.content.toLowerCase());
      }
    }
  }

  // 如果还有空间且还有中等置信度的建议，继续添加
  if (result.length < maxTotal) {
    const mediumConfidenceSuggestions = smartSuggestions
      .filter(s => s.confidence >= 0.3 && s.confidence < 0.6)
      .sort((a, b) => b.confidence - a.confidence);

    for (const suggestion of mediumConfidenceSuggestions) {
      if (result.length >= maxTotal) break;
      if (!seenContents.has(suggestion.content.toLowerCase())) {
        result.push(suggestion);
        seenContents.add(suggestion.content.toLowerCase());
      }
    }
  }

  return result;
}