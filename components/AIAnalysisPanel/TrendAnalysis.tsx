'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Brain, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_NAMES, CATEGORY_ICONS } from './constants';

interface TrendAnalysisData {
  currentMonth: number;
  lastMonth: number;
  changePercent: number;
  changeAmount: number;
  categories: Array<{
    category: string;
    current: number;
    last: number;
    changePercent: number;
    icon: string;
  }>;
}

interface TrendAnalysisProps {
  data: TrendAnalysisData | null;
  loading?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function TrendAnalysis({
  data,
  loading = false,
  collapsed = false,
  onToggle
}: TrendAnalysisProps) {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={onToggle}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
              可变支出趋势分析
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
              {data ? (
                <>
                  {/* 月度总览 */}
                  <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">本月可变支出</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ¥{data.currentMonth.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.changePercent >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        data.changePercent >= 0 ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {data.changePercent >= 0 ? '+' : ''}
                        {data.changePercent.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        (¥{Math.abs(data.changeAmount).toFixed(0)})
                      </span>
                    </div>
                  </div>

                  {/* 分类趋势 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">主要类别趋势</div>
                    {data.categories.map((category) => (
                      <div key={category.category} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <span className="text-sm text-gray-700">
                            {CATEGORY_NAMES[category.category] || category.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">¥{category.current.toFixed(0)}</span>
                          {category.changePercent !== 0 && (
                            <span className={`text-xs px-1 rounded ${
                              category.changePercent > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {category.changePercent > 0 ? '+' : ''}
                              {category.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">
                    {loading ? '分析中...' : '暂无数据'}
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
