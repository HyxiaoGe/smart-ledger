// 备注输入组件 - 支持联想输入和常用备注选择
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CommonNote } from '@/types/transaction';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface NoteInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NoteInput({
  value = '',
  onChange,
  placeholder = '可选',
  className = '',
  disabled = false
}: NoteInputProps) {
  const [suggestions, setSuggestions] = useState<CommonNote[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localCache, setLocalCache] = useState<CommonNote[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const needsRemoteFetchRef = useRef(false);
  const initialFetchControllerRef = useRef<AbortController | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  // 加载本地缓存的常用备注
  useEffect(() => {
    loadLocalCache();
  }, []);

  // 本地缓存加载
  const loadLocalCache = async () => {
    let needsRemoteFetch = true;

    try {
      const cached = localStorage.getItem('common-notes-cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 缓存1天内有效
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setLocalCache(data);
          needsRemoteFetch = false;
        }
      }
    } catch {
      needsRemoteFetch = true;
    }

    needsRemoteFetchRef.current = needsRemoteFetch;
  };

  // 从服务器获取常用备注
  const fetchCommonNotes = async () => {
    try {
      setIsLoading(true);
      if (initialFetchControllerRef.current) {
        initialFetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      initialFetchControllerRef.current = controller;
      const response = await fetch('/api/common-notes?limit=10', { signal: controller.signal });
      if (response.ok) {
        const { data } = await response.json();
        setLocalCache(data);
        // 更新本地缓存
        localStorage.setItem('common-notes-cache', JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        needsRemoteFetchRef.current = false;
      } else {
        needsRemoteFetchRef.current = true;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      // ignore fetch errors to keep UI responsive
      needsRemoteFetchRef.current = true;
    } finally {
      setIsLoading(false);
    }
  };

  // 本地搜索函数 - 零网络请求
  const searchInLocalCache = useCallback((query: string): CommonNote[] => {
    if (!query.trim()) {
      return localCache.slice(0, 8); // 默认显示前8个最常用的
    }

    const trimmedQuery = query.trim().toLowerCase();
    return localCache
      .filter(note =>
        note.content.toLowerCase().includes(trimmedQuery)
      )
      .sort((a, b) => {
        // 优先级排序：使用次数 > 最近使用时间
        if (b.usage_count !== a.usage_count) {
          return b.usage_count - a.usage_count;
        }
        return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
      })
      .slice(0, 6); // 搜索时显示前6个匹配结果
  }, [localCache]);

  // 处理输入变化（带防抖）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);

    if (needsRemoteFetchRef.current && !isLoading) {
      needsRemoteFetchRef.current = false;
      void fetchCommonNotes();
    }

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 本地搜索（立即响应）
    const results = searchInLocalCache(newValue);
    setSuggestions(results);
    setSelectedSuggestionIndex(-1);

    // 如果有输入内容且本地搜索结果较少，尝试从服务器搜索
    if (newValue.trim() && results.length < 3) {
      debounceTimerRef.current = setTimeout(() => {
        searchFromServer(newValue.trim());
      }, 300);
    }
  };

  // 从服务器搜索（仅在本地的结果不够时）
  const searchFromServer = async (query: string) => {
    try {
      if (searchControllerRef.current) {
        searchControllerRef.current.abort();
      }
      const controller = new AbortController();
      searchControllerRef.current = controller;
      const response = await fetch(`/api/common-notes?search=${encodeURIComponent(query)}&limit=6`, {
        signal: controller.signal
      });
      if (response.ok) {
        const { data } = await response.json();
        setSuggestions(data);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      // ignore search errors to keep existing suggestions
    }
  };

  // 处理建议选择
  const handleSuggestionClick = (suggestion: CommonNote) => {
    onChange?.(suggestion.content);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // 处理焦点事件
  const handleFocus = () => {
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
    if (needsRemoteFetchRef.current && !isLoading) {
      needsRemoteFetchRef.current = false;
      void fetchCommonNotes();
    }
    // 在焦点时显示默认建议
    if (!value.trim()) {
      setSuggestions(localCache.slice(0, 8));
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // 延迟隐藏建议，以便点击建议项
    setTimeout(() => {
      if (!containerRef.current?.contains(e.relatedTarget)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }, 200);
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (initialFetchControllerRef.current) {
        initialFetchControllerRef.current.abort();
      }
      if (searchControllerRef.current) {
        searchControllerRef.current.abort();
      }
    };
  }, [containerRef]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />

      {/* 建议列表 */}
      {showSuggestions && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              加载中...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {/* 如果有输入内容，显示搜索结果标题 */}
              {value.trim() && (
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  匹配的常用备注
                </div>
              )}

              {/* 建议项列表 */}
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 group ${
                    index === selectedSuggestionIndex
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate flex-1 mr-2">{suggestion.content}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-[80px] justify-end">
                      {suggestion.usage_count > 5 && (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          热门
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors whitespace-nowrap w-[35px] text-right">
                        {suggestion.usage_count}次
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : value.trim() ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              没有找到匹配的常用备注
            </div>
          ) : localCache.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              暂无常用备注，开始记账后会自动记录
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
