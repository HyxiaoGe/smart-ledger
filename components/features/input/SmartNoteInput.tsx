/* eslint-disable */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  smartSuggestionsService,
  smartSuggestionsCache,
  mergeSuggestions,
  type SmartSuggestion
} from '@/lib/services/smartSuggestions';
import { recordSuggestionLearning } from '@/lib/services/suggestionLearning';
import { generateTimeContext } from '@/lib/domain/noteContext';
import type { CommonNote, SmartSuggestionParams } from '@/types/domain/transaction';
import { AlertCircle, Lightbulb, TrendingUp, Clock, Target } from 'lucide-react';

/**
 * 建议类型配置
 * 提取到组件外部避免每次渲染重复创建
 */
const SUGGESTION_TYPE_CONFIG = {
  context: {
    icon: Target,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  pattern: {
    icon: Clock,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  frequency: {
    icon: TrendingUp,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  similarity: {
    icon: Lightbulb,
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  default: {
    icon: Lightbulb,
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  }
} as const;

type SmartNoteInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  // 新增上下文参数
  category?: string;
  amount?: number;
  currency?: string;
  onSuggestionSelected?: (suggestion: SmartSuggestion | CommonNote, type: string) => void;
};

const SmartNoteInputComponent = function SmartNoteInput({
  value = '',
  onChange,
  placeholder = '选择分类和金额后，智能提示将自动显示',
  className = '',
  disabled = false,
  category,
  amount,
  currency = 'CNY',
  onSuggestionSelected
}: SmartNoteInputProps) {
  const [suggestions, setSuggestions] = useState<Array<SmartSuggestion | CommonNote>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoTriggeredRef = useRef(false); // 记录是否自动触发过
  const lastParamsRef = useRef<SmartSuggestionParams | null>(null);

  // 获取建议类型图标（使用配置）
  const getSuggestionIcon = (suggestion: SmartSuggestion | CommonNote) => {
    const type = 'type' in suggestion ? suggestion.type : 'default';
    const config = SUGGESTION_TYPE_CONFIG[type] || SUGGESTION_TYPE_CONFIG.default;
    const IconComponent = config.icon;
    return <IconComponent className="h-3 w-3" />;
  };

  // 获取建议类型颜色（使用配置）
  const getSuggestionColor = (suggestion: SmartSuggestion | CommonNote) => {
    const type = 'type' in suggestion ? suggestion.type : 'default';
    const config = SUGGESTION_TYPE_CONFIG[type] || SUGGESTION_TYPE_CONFIG.default;
    return config.color;
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return '';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-blue-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-gray-500 dark:text-gray-400';
  };

  // 获取智能建议
  const fetchSmartSuggestions = useCallback(async (params: SmartSuggestionParams) => {
    if (!category && !amount && !params.partial_input?.trim()) {
      // 如果没有足够的上下文信息，返回空建议
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 先检查缓存
      const cached = smartSuggestionsCache.get(params);
      if (cached) {
        const merged = mergeSuggestions(cached.suggestions, cached.fallback_notes, 6);
        setSuggestions(merged);
        setShowSuggestions(true); // 自动显示建议
        setIsLoading(false);
        return;
      }

      // 调用API获取智能建议
      const response = await smartSuggestionsService.getSuggestions(params);
      smartSuggestionsCache.set(params, response);

      const merged = mergeSuggestions(response.suggestions, response.fallback_notes, 6);
      setSuggestions(merged);
      setShowSuggestions(true); // 自动显示建议
    } catch (err: unknown) {
      console.error('获取智能建议失败:', err);
      setError('智能建议加载失败');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [category, amount]);

  // 处理输入变化
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      onChange?.(nextValue);
      setActiveIndex(-1);

      // 构建智能建议参数
      const timeContext = generateTimeContext();
      const params: SmartSuggestionParams = {
        category,
        amount,
        currency,
        time_context: timeContext.label,
        partial_input: nextValue,
        limit: 8
      };

      lastParamsRef.current = params;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 防抖获取建议
      debounceRef.current = setTimeout(() => {
        fetchSmartSuggestions(params).catch((err) => {
          console.error('获取智能建议失败:', err);
        });
      }, 300);

      // 如果用户开始输入，立即显示建议（如果有缓存的话）
      if (nextValue.trim().length > 0) {
        setShowSuggestions(true);
      }
    },
    [onChange, category, amount, currency, fetchSmartSuggestions]
  );

  // 选择建议
  const handleChooseSuggestion = useCallback(
    (suggestion: SmartSuggestion | CommonNote) => {
      const content = suggestion.content;
      onChange?.(content);
      setShowSuggestions(false);
      setActiveIndex(-1);

      // 记录学习数据
      const timeContext = generateTimeContext();
      const context = {
        category,
        amount,
        currency,
        time_context: timeContext.label,
        partial_input: value
      };

      // 使用新的学习系统记录数据
      recordSuggestionLearning.selected(suggestion, context, content);

      // 通知外部组件
      onSuggestionSelected?.(suggestion, 'type' in suggestion ? suggestion.type : 'frequency');
    },
    [onChange, category, amount, currency, value, onSuggestionSelected]
  );

  // 处理焦点
  const handleFocus = useCallback(() => {
    // 🎯 只有在有金额时才显示建议，避免无意义的提示
    if (category && amount && amount > 0) {
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
      fetchSmartSuggestions(params).catch((err) => {
        console.error('获取智能建议失败:', err);
      });
    } else {
      // 没有金额时不显示建议面板
      setShowSuggestions(false);
    }
  }, [category, amount, currency, value, fetchSmartSuggestions]);

  // 处理失焦
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      // 检查失焦的目标是否是建议面板内部元素
      if (!containerRef.current?.contains(event.relatedTarget)) {
        setShowSuggestions(false);

        // 记录用户忽略了所有建议
        if (lastParamsRef.current && suggestions.length > 0 && value.trim()) {
          const timeContext = generateTimeContext();
          const context = {
            category,
            amount,
            currency,
            time_context: timeContext.label,
            partial_input: value
          };

          // 记录忽略建议的学习数据
          recordSuggestionLearning.ignored(suggestions, context, value);
        }
      }
    }, 100); // 减少延迟时间，提升响应速度
  }, [suggestions, value, category, amount, currency]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        handleChooseSuggestion(suggestions[activeIndex]);
      } else if (event.key === 'Escape') {
        // ESC 键关闭建议面板
        setShowSuggestions(false);
        setActiveIndex(-1);
        event.preventDefault();
      }
    },
    [activeIndex, handleChooseSuggestion, showSuggestions, suggestions]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 🎯 自动触发智能提示：当类别和金额都有值时
  useEffect(() => {
    // 只有当类别和金额都有值时才自动触发
    if (category && amount && amount > 0 && !autoTriggeredRef.current) {
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
      autoTriggeredRef.current = true; // 标记已自动触发

      fetchSmartSuggestions(params).catch((err) => {
        console.error('获取智能建议失败:', err);
      });
    } else if ((!category || !amount || amount <= 0) && autoTriggeredRef.current) {
      // 如果条件不满足，重置自动触发标记并隐藏建议
      autoTriggeredRef.current = false;
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [category, amount, currency, value, fetchSmartSuggestions]);

  // 定期清理缓存和学习数据发送
  useEffect(() => {
    const cleanup = setInterval(() => {
      smartSuggestionsCache.cleanup();
    }, 10 * 60 * 1000); // 每10分钟清理一次

    return () => {
      clearInterval(cleanup);
      // 组件卸载时发送待处理的学习数据
      recordSuggestionLearning.flush();
    };
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      setShowSuggestions(false);
      setActiveIndex(-1);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showSuggestions]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <ClearableInput
        value={value}
        onChange={handleInputChange}
        onClear={() => onChange?.('')}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* 智能提示面板 */}
      {showSuggestions && !disabled && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* 错误状态 */}
          {error && (
            <div className="p-3 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && !error && (
            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
              正在分析智能建议…
            </div>
          )}

          {/* 建议列表 */}
          {!isLoading && !error && suggestions.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={'type' in suggestion ? suggestion.id : `legacy-${suggestion.id}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleChooseSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 transition-all duration-200 ease-in-out cursor-pointer ${
                    index === activeIndex
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-500 shadow-sm'
                      : 'border-gray-50 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/50 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* 左侧内容 */}
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* 类型图标 */}
                      <div className={`p-1 rounded border ${getSuggestionColor(suggestion)} mt-0.5 flex-shrink-0`}>
                        {getSuggestionIcon(suggestion)}
                      </div>

                      {/* 备注内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {suggestion.content}
                        </div>

                        {/* 推荐理由 */}
                        {'reason' in suggestion && suggestion.reason && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {suggestion.reason}
                          </div>
                        )}

                        {/* 元数据 */}
                        {'metadata' in suggestion && suggestion.metadata && (
                          <div className="flex items-center gap-2 mt-1">
                            {suggestion.metadata.avg_amount && (
                              <span className="text-xs text-gray-400 dark:text-gray-400">
                                ¥{suggestion.metadata.avg_amount}
                              </span>
                            )}
                            {suggestion.metadata.usage_count && (
                              <span className="text-xs text-gray-400 dark:text-gray-400">
                                {suggestion.metadata.usage_count}次
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 右侧置信度 */}
                    {'confidence' in suggestion && (
                      <div className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)} flex-shrink-0`}>
                        {Math.round(suggestion.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && !error && suggestions.length === 0 && (category || amount) && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>暂无智能建议</div>
              <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                请直接输入备注内容
              </div>
            </div>
          )}

          {/* 无上下文提示 */}
          {!isLoading && !error && suggestions.length === 0 && !category && !amount && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <div className="text-xs text-gray-400 dark:text-gray-400">
                选择类别和金额后，将显示智能备注建议
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 使用 React.memo 优化渲染性能
 * 只在关键 props 变化时才重新渲染
 */
export const SmartNoteInput = React.memo(SmartNoteInputComponent, (prevProps, nextProps) => {
  // 返回 true 表示不重新渲染，false 表示需要重新渲染
  return (
    prevProps.value === nextProps.value &&
    prevProps.category === nextProps.category &&
    prevProps.amount === nextProps.amount &&
    prevProps.currency === nextProps.currency &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.className === nextProps.className
    // onChange 和 onSuggestionSelected 函数引用变化不触发重渲染
  );
});
