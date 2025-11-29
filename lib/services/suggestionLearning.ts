import { apiClient } from '@/lib/api/client';
import { generateSessionId } from '@/lib/utils/helpers';

export type LearningEventType = 'suggestion_selected' | 'suggestion_ignored' | 'manual_input';

export type SuggestionLearningData = {
  event_type: LearningEventType;
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
  final_input: string;
  learning_outcome: 'positive' | 'negative' | 'neutral';
};

class SuggestionLearningManager {
  private static instance: SuggestionLearningManager;
  private sessionId: string;
  private pendingData: SuggestionLearningData[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.sessionId = generateSessionId();
    this.setupAutoFlush();
  }

  static getInstance(): SuggestionLearningManager {
    if (!SuggestionLearningManager.instance) {
      SuggestionLearningManager.instance = new SuggestionLearningManager();
    }
    return SuggestionLearningManager.instance;
  }

  /**
   * 记录用户选择了某个建议
   */
  recordSuggestionSelected(
    suggestion: any,
    context: any,
    finalInput: string
  ): void {
    const learningData: SuggestionLearningData = {
      event_type: 'suggestion_selected',
      context,
      suggestion_data: {
        suggestion_id: suggestion.id,
        suggestion_type: suggestion.type || 'frequency',
        content: suggestion.content,
        confidence: suggestion.confidence,
        reason: suggestion.reason
      },
      final_input: finalInput,
      learning_outcome: 'positive'
    };

    this.addLearningData(learningData);
  }

  /**
   * 记录用户忽略了所有建议
   */
  recordSuggestionsIgnored(
    suggestions: any[],
    context: any,
    finalInput: string
  ): void {
    if (suggestions.length === 0) return;

    const ignoredSuggestions = suggestions.map(s => ({
      suggestion_id: s.id,
      suggestion_type: s.type || 'frequency',
      content: s.content,
      confidence: s.confidence
    }));

    const learningData: SuggestionLearningData = {
      event_type: 'suggestion_ignored',
      context,
      ignored_suggestions: ignoredSuggestions,
      final_input: finalInput,
      learning_outcome: 'negative'
    };

    this.addLearningData(learningData);
  }

  /**
   * 记录用户手动输入（没有使用任何建议）
   */
  recordManualInput(
    context: any,
    finalInput: string
  ): void {
    const learningData: SuggestionLearningData = {
      event_type: 'manual_input',
      context,
      final_input: finalInput,
      learning_outcome: 'neutral'
    };

    this.addLearningData(learningData);
  }

  /**
   * 添加学习数据到待发送队列
   */
  private addLearningData(data: SuggestionLearningData): void {
    this.pendingData.push({
      ...data,
      timestamp: new Date().toISOString()
    } as any);

    // 如果队列数据过多，立即发送
    if (this.pendingData.length >= 5) {
      void this.flushLearningData();
    }
  }

  /**
   * 发送学习数据到服务器
   */
  async flushLearningData(): Promise<void> {
    if (this.pendingData.length === 0) return;

    const dataToSend = [...this.pendingData];
    this.pendingData = [];

    try {
      await apiClient.post('/api/smart-suggestions/learning', {
        session_id: this.sessionId,
        learning_data: dataToSend
      });
    } catch (error) {
      console.error('学习数据发送失败:', error);
      // 发送失败时重新加入队列
      this.pendingData.unshift(...dataToSend);
    }
  }

  /**
   * 设置自动发送定时器
   */
  private setupAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.pendingData.length > 0) {
        void this.flushLearningData();
      }
    }, 30000); // 每30秒发送一次
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // 发送剩余数据
    if (this.pendingData.length > 0) {
      void this.flushLearningData();
    }
  }
}

export const suggestionLearningManager = SuggestionLearningManager.getInstance();

// 在页面卸载时自动发送学习数据
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    suggestionLearningManager.destroy();
  });
}

/**
 * 便捷的学习数据记录函数
 */
export const recordSuggestionLearning = {
  /**
   * 记录建议被选择
   */
  selected: (
    suggestion: any,
    context: any,
    finalInput: string
  ) => {
    suggestionLearningManager.recordSuggestionSelected(suggestion, context, finalInput);
  },

  /**
   * 记录建议被忽略
   */
  ignored: (
    suggestions: any[],
    context: any,
    finalInput: string
  ) => {
    suggestionLearningManager.recordSuggestionsIgnored(suggestions, context, finalInput);
  },

  /**
   * 记录手动输入
   */
  manual: (
    context: any,
    finalInput: string
  ) => {
    suggestionLearningManager.recordManualInput(context, finalInput);
  },

  /**
   * 手动发送待处理的学习数据
   */
  flush: () => {
    return suggestionLearningManager.flushLearningData();
  }
};
