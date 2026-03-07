'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { QuickTransactionSuggestion } from '@/lib/api/services/ai';
import {
  getQuickSuggestionCategoryIcon,
  getQuickSuggestionConfidenceColor,
} from '../utils';

interface QuickSuggestionListProps {
  suggestions: QuickTransactionSuggestion[];
  submittingId: string | null;
  isPending: boolean;
  lastSuccessSuggestionId?: string;
  showSuccessIndicator?: boolean;
  onSubmit: (suggestion: QuickTransactionSuggestion) => void;
}

export function QuickSuggestionList({
  suggestions,
  submittingId,
  isPending,
  lastSuccessSuggestionId,
  showSuccessIndicator = false,
  onSubmit,
}: QuickSuggestionListProps) {
  return (
    <div className="grid gap-3">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="group relative rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-2xl flex-shrink-0">{suggestion.icon}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-gray-900 group-hover:text-orange-700">
                    {suggestion.title}
                  </div>
                  <div className="text-xl">
                    {getQuickSuggestionCategoryIcon(suggestion.category)}
                  </div>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                  {suggestion.description}
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getQuickSuggestionConfidenceColor(suggestion.confidence)}`}
                  >
                    {Math.round(suggestion.confidence * 100)}% 置信度
                  </Badge>
                  <span className="text-xs text-gray-400 dark:text-gray-400">
                    {suggestion.reason}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-lg font-bold text-gray-900 mb-2">¥{suggestion.amount}</div>

              <Button
                size="sm"
                onClick={() => onSubmit(suggestion)}
                disabled={submittingId === suggestion.id || isPending}
                className="min-w-[80px] bg-orange-500 hover:bg-orange-600 text-white"
              >
                {submittingId === suggestion.id ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    记录中
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    快速记账
                  </>
                )}
              </Button>
            </div>
          </div>

          {showSuccessIndicator && lastSuccessSuggestionId === suggestion.id && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
              <CheckCircle className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
