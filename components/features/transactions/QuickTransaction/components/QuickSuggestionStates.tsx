'use client';

import { Clock } from 'lucide-react';

interface QuickSuggestionLoadingStateProps {
  message: string;
}

export function QuickSuggestionLoadingState({
  message,
}: QuickSuggestionLoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
      <div className="text-sm">{message}</div>
    </div>
  );
}

interface QuickSuggestionEmptyStateProps {
  title: string;
  description: string;
}

export function QuickSuggestionEmptyState({
  title,
  description,
}: QuickSuggestionEmptyStateProps) {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
      <div className="text-sm">{title}</div>
      <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">{description}</div>
    </div>
  );
}

interface QuickSuggestionSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function QuickSuggestionSection({
  title,
  children,
}: QuickSuggestionSectionProps) {
  if (!title) {
    return children;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">{title}</div>
      {children}
    </div>
  );
}
