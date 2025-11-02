/* eslint-disable */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CommonNote } from '@/types/transaction';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCommonNotes } from '@/hooks/useCommonNotes';

type NoteInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function NoteInput({
  value = '',
  onChange,
  placeholder = '可选',
  className = '',
  disabled = false
}: NoteInputProps) {
  const { localCache, isLoading, ensureFreshList, searchRemote } = useCommonNotes();
  const [suggestions, setSuggestions] = useState<CommonNote[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchLocal = useCallback(
    (keyword: string) => {
      if (!keyword.trim()) {
        return localCache.slice(0, 8);
      }
      const lower = keyword.trim().toLowerCase();
      return localCache
        .filter((item) => item.content.toLowerCase().includes(lower))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 6);
    },
    [localCache]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      onChange?.(nextValue);
      setSuggestions(searchLocal(nextValue));
      setActiveIndex(-1);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (nextValue.trim().length === 0) {
        return;
      }

      debounceRef.current = setTimeout(() => {
        searchRemote(nextValue.trim())
          .then((remote) => {
            if (remote.length > 0) {
              setSuggestions(remote);
              setActiveIndex(-1);
            }
          })
          .catch(() => undefined);
      }, 300);
    },
    [onChange, searchLocal, searchRemote]
  );

  const handleChoose = useCallback(
    (note: CommonNote) => {
      onChange?.(note.content);
      setShowSuggestions(false);
      setActiveIndex(-1);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setShowSuggestions(true);
    setSuggestions(searchLocal(value));
    void ensureFreshList();
  }, [ensureFreshList, searchLocal, value]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      if (!containerRef.current?.contains(event.relatedTarget)) {
        setShowSuggestions(false);
      }
    }, 150);
  }, []);

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
        handleChoose(suggestions[activeIndex]);
      }
    },
    [activeIndex, handleChoose, showSuggestions, suggestions]
  );

  useEffect(() => () => debounceRef.current && clearTimeout(debounceRef.current), []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />

      {showSuggestions && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">加载中…</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                type="button"
                key={suggestion.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleChoose(suggestion);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="truncate mr-3">{suggestion.content}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {suggestion.usage_count > 5 ? <Badge variant="outline">热门</Badge> : null}
                  <span>{suggestion.usage_count} 次</span>
                </span>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {value.trim() ? '没有找到匹配的常用备注' : '暂无常用备注，开始记账后会自动记录'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

