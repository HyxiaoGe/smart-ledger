/* eslint-disable */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  smartSuggestionsService,
  smartSuggestionsCache,
  type SmartSuggestion
} from '@/lib/services/smartSuggestions';
import { generateTimeContext } from '@/lib/domain/noteContext';
import type { CommonNote, SmartSuggestionParams } from '@/types/transaction';

interface UseSmartNoteInputOptions {
  category?: string;
  amount?: number;
  currency?: string;
  onSuggestionSelected?: (suggestion: SmartSuggestion | CommonNote, type: string) => void;
  enableLearning?: boolean; // 是否启用学习优化
}

interface UseSmartNoteInputResult {
  value: string;
  setValue: (value: string) => void;
  suggestions: Array<SmartSuggestion | CommonNote>;
  isLoading: boolean;
  error: string;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  handleInputChange: (value: string) => void;
  handleInputFocus: () => void;
  handleInputBlur: () => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  selectSuggestion: (suggestion: SmartSuggestion | CommonNote) => void;
  clearSuggestions: () => void;
  refreshSuggestions: () => Promise<void>;
}

export function useSmartNoteInput({
  category,
  amount,
  currency = 'CNY',
  onSuggestionSelected,
  enableLearning = true
}: UseSmartNoteInputOptions = {}): UseSmartNoteInputResult {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Array<SmartSuggestion | CommonNote>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastParamsRef = useRef<SmartSuggestionParams | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取智能建议
  const fetchSmartSuggestions = useCallback(async (params: SmartSuggestionParams) => {
    // 如果没有足够的上下文信息，返回空建议
    if (!category && !amount && !params.partial_input?.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 先检查缓存
      const cached = smartSuggestionsCache.get(params);
      if (cached) {
        setSuggestions([
          ...cached.suggestions,
          ...cached.fallback_notes
        ]);
        setIsLoading(false);
        return;
      }

      // 调用API获取智能建议
      const response = await smartSuggestionsService.getSuggestions(params);
      smartSuggestionsCache.set(params, response);

      setSuggestions([
        ...response.suggestions,
        ...response.fallback_notes
      ]);
    } catch (err: any) {
      console.error('获取智能建议失败:', err);
      setError('智能建议加载失败');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [category, amount]);

  // 处理输入变化
  const handleInputChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      setActiveIndex(-1);

      // 构建智能建议参数
      const timeContext = generateTimeContext();
      const params: SmartSuggestionParams = {
        category,
        amount,
        currency,
        time_context: timeContext.label,
        partial_input: newValue,
        limit: 8
      };

      lastParamsRef.current = params;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 防抖获取建议
      debounceRef.current = setTimeout(() => {
        void fetchSmartSuggestions(params);
      }, 300);

      // 如果用户开始输入，立即显示建议
      if (newValue.trim().length > 0) {
        setShowSuggestions(true);
      }
    },
    [category, amount, currency, fetchSmartSuggestions]
  );

  // 选择建议
  const selectSuggestion = useCallback(
    (suggestion: SmartSuggestion | CommonNote) => {
      const content = suggestion.content;
      setValue(content);
      setShowSuggestions(false);
      setActiveIndex(-1);

      // 记录用户选择了建议（用于学习优化）
      if (enableLearning) {
        if ('type' in suggestion) {
          const timeContext = generateTimeContext();
          void smartSuggestionsService.recordSuggestionUsage({
            suggestion_id: suggestion.id,
            suggestion_type: suggestion.type,
            content: suggestion.content,
            context: {
              category,
              amount,
              currency,
              time_context: timeContext.label
            }
          });
        }
      }

      // 通知外部组件
      onSuggestionSelected?.(suggestion, 'type' in suggestion ? suggestion.type : 'frequency');
    },
    [category, amount, currency, enableLearning, onSuggestionSelected]
  );

  // 处理焦点
  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);

    // 聚焦时立即获取建议
    const timeContext = generateTimeContext();
    const params: SmartSuggestionParams = {
      category,
      amount,
      currency,
      time_context: timeContext.label,
      partial_input: value,
      limit: 8
    };

    lastParamsRef.current = params;
    void fetchSmartSuggestions(params);
  }, [category, amount, currency, value, fetchSmartSuggestions]);

  // 处理失焦
  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false);

      // 记录用户忽略了所有建议
      if (enableLearning && lastParamsRef.current && suggestions.length > 0) {
        const suggestionIds = suggestions.map(s => 'id' in s ? s.id : `legacy-${s.id}`);
        void smartSuggestionsService.recordSuggestionIgnored({
          suggestion_ids: suggestionIds,
          context: lastParamsRef.current!
        });
      }
    }, 150);
  }, [enableLearning, suggestions]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      } else if (event.key === 'Escape') {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    },
    [activeIndex, selectSuggestion, showSuggestions, suggestions]
  );

  // 清空建议
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setError('');
  }, []);

  // 刷新建议
  const refreshSuggestions = useCallback(async () => {
    if (lastParamsRef.current) {
      // 清除缓存，强制重新获取
      smartSuggestionsCache.clear();
      await fetchSmartSuggestions(lastParamsRef.current);
    }
  }, [fetchSmartSuggestions]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 定期清理缓存
  useEffect(() => {
    const cleanup = setInterval(() => {
      smartSuggestionsCache.cleanup();
    }, 10 * 60 * 1000); // 每10分钟清理一次

    return () => clearInterval(cleanup);
  }, []);

  // 当上下文发生变化时，更新建议
  useEffect(() => {
    if (showSuggestions && (category || amount)) {
      const timeContext = generateTimeContext();
      const params: SmartSuggestionParams = {
        category,
        amount,
        currency,
        time_context: timeContext.label,
        partial_input: value,
        limit: 8
      };

      lastParamsRef.current = params;
      void fetchSmartSuggestions(params);
    }
  }, [category, amount, currency, showSuggestions, value, fetchSmartSuggestions]);

  return {
    value,
    setValue,
    suggestions,
    isLoading,
    error,
    showSuggestions,
    setShowSuggestions,
    activeIndex,
    setActiveIndex,
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    handleKeyDown,
    selectSuggestion,
    clearSuggestions,
    refreshSuggestions
  };
}