'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_CONFIG } from './constants';

interface Suggestion {
  category: string;
  suggestion: string;
  potential: number;
  priority: 'high' | 'medium' | 'low';
}

interface PersonalizedAdviceData {
  recommendedBudget: number;
  suggestedSavings: number;
  suggestions: Suggestion[];
}

interface OptimizationAdviceProps {
  data: PersonalizedAdviceData | null;
  loading?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  maxDisplay?: number;
}

export function OptimizationAdvice({
  data,
  loading = false,
  collapsed = false,
  onToggle,
  onSuggestionClick,
  maxDisplay = 3
}: OptimizationAdviceProps) {
  const displayedSuggestions = data?.suggestions.slice(0, maxDisplay) || [];
  const hasMore = (data?.suggestions.length || 0) > maxDisplay;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={onToggle}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
              智能优化建议
            </span>
          </div>
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </motion.div>
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              {data?.suggestions && data.suggestions.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {displayedSuggestions.map((suggestion, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {suggestion.category}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                PRIORITY_CONFIG[suggestion.priority].className
                              }`}>
                                {PRIORITY_CONFIG[suggestion.priority].label}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              ¥{suggestion.potential.toFixed(2)}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {suggestion.suggestion}
                            </p>
                            {onSuggestionClick && (
                              <div className="mt-2">
                                <button
                                  onClick={() => onSuggestionClick(suggestion)}
                                  className="text-xs text-purple-600 hover:text-purple-800"
                                >
                                  查看详细分析 →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 查看更多按钮 */}
                  {hasMore && (
                    <div className="text-center pt-2">
                      <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                        查看全部 {data.suggestions.length} 条建议 →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">
                    {loading ? '分析中...' : '暂无建议'}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
