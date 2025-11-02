'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MERCHANT_SUGGESTIONS, SUBCATEGORY_DEFINITIONS } from '@/lib/config/config';
import { Store, ChevronDown } from 'lucide-react';

type MerchantInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  category?: string;
  onMerchantSelected?: (merchant: string) => void; // eslint-disable-line @typescript-eslint/no-unused-vars
};

/**
 * 商家输入组件 - 支持基于分类的智能自动补全
 */
export function MerchantInput({
  value = '',
  onChange,
  placeholder = '输入商家名称（可选）',
  className = '',
  disabled = false,
  category,
  onMerchantSelected
}: MerchantInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // 获取当前分类的商家建议
  const getMerchantSuggestions = useCallback((inputValue: string, currentCategory?: string) => {
    // 获取当前分类的商家列表
    const categoryMerchants = currentCategory && currentCategory in MERCHANT_SUGGESTIONS
      ? MERCHANT_SUGGESTIONS[currentCategory]
      : [];

    // 获取其他分类的商家（作为补充）
    const otherMerchants = Object.entries(MERCHANT_SUGGESTIONS)
      .filter(([key]) => key !== currentCategory && key !== 'other')
      .flatMap(([, merchants]) => merchants);

    // 合并所有商家（当前分类优先）
    const allMerchants = [...new Set([...categoryMerchants, ...otherMerchants, ...(MERCHANT_SUGGESTIONS.other || [])])];

    // 如果输入为空，返回当前分类的建议
    if (!inputValue.trim()) {
      return categoryMerchants.slice(0, 6);
    }

    // 根据输入过滤
    const filtered = allMerchants.filter(merchant =>
      merchant.toLowerCase().includes(inputValue.toLowerCase())
    );

    // 优先显示当前分类的匹配项
    const categoryMatches = filtered.filter(m => categoryMerchants.includes(m));
    const otherMatches = filtered.filter(m => !categoryMerchants.includes(m));

    return [...categoryMatches, ...otherMatches].slice(0, 8);
  }, []);

  // 处理输入变化
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      onChange?.(nextValue);
      setActiveIndex(-1);

      // 更新建议列表
      const newSuggestions = getMerchantSuggestions(nextValue, category);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    },
    [onChange, category, getMerchantSuggestions]
  );

  // 选择商家
  const handleChooseMerchant = useCallback(
    (merchant: string) => {
      onChange?.(merchant);
      setShowSuggestions(false);
      setActiveIndex(-1);
      onMerchantSelected?.(merchant);
    },
    [onChange, onMerchantSelected]
  );

  // 处理焦点
  const handleFocus = useCallback(() => {
    const newSuggestions = getMerchantSuggestions(value, category);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  }, [value, category, getMerchantSuggestions]);

  // 处理失焦
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      if (!containerRef.current?.contains(event.relatedTarget)) {
        setShowSuggestions(false);
      }
    }, 100);
  }, []);

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
        handleChooseMerchant(suggestions[activeIndex]);
      } else if (event.key === 'Escape') {
        setShowSuggestions(false);
        setActiveIndex(-1);
        event.preventDefault();
      }
    },
    [activeIndex, handleChooseMerchant, showSuggestions, suggestions]
  );

  // 当分类变化时，更新建议
  useEffect(() => {
    if (category) {
      const newSuggestions = getMerchantSuggestions(value, category);
      setSuggestions(newSuggestions);
    }
  }, [category, value, getMerchantSuggestions]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        <Store className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {/* 建议面板 */}
      {showSuggestions && !disabled && suggestions.length > 0 && (
        <>
          {/* 点击外部关闭的透明背景层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSuggestions(false)}
            style={{ backgroundColor: 'transparent' }}
          />

          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {/* 分类提示 */}
              {category && category in MERCHANT_SUGGESTIONS && (
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  常用商家建议
                </div>
              )}

              {/* 商家列表 */}
              {suggestions.map((merchant, index) => (
                <button
                  key={merchant}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleChooseMerchant(merchant);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm border-b border-gray-50 last:border-b-0 transition-colors ${
                    index === activeIndex
                      ? 'bg-blue-50 border-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{merchant}</span>
                    {category && category in MERCHANT_SUGGESTIONS && MERCHANT_SUGGESTIONS[category].includes(merchant) && (
                      <span className="ml-auto text-xs text-blue-600">推荐</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 子分类选择组件
 */
type SubcategorySelectProps = {
  category?: string;
  value?: string;
  onChange?: (value: string) => void; // eslint-disable-line @typescript-eslint/no-unused-vars
  disabled?: boolean;
  className?: string;
};

export function SubcategorySelect({
  category,
  value,
  onChange,
  disabled = false,
  className = ''
}: SubcategorySelectProps) {
  const subcategories = category && category in SUBCATEGORY_DEFINITIONS
    ? SUBCATEGORY_DEFINITIONS[category]
    : [];

  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <select
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50 appearance-none pr-8"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      >
        <option value="">选择子分类（可选）</option>
        {subcategories.map((sub) => (
          <option key={sub.key} value={sub.key}>
            {sub.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
