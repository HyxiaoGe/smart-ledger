'use client';

import React, { useState, useEffect } from 'react';
import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressToast } from '@/components/ProgressToast';
import { CheckCircle, X, Edit2, RefreshCw } from 'lucide-react';
import { FaRobot, FaCheck, FaHeart } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface QuickTransactionItem {
  id: string;
  title: string;
  icon: string;
  category: string;
  fixedAmount?: number;  // 固定价格，如地铁
  suggestedAmount?: number;  // 建议价格，如午饭
  isFixed: boolean;  // 是否固定价格
}

interface QuickTransactionCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// 基于历史数据的快速记账项目
const QUICK_ITEMS: QuickTransactionItem[] = [
  {
    id: 'subway',
    title: '地铁通勤',
    icon: '🚇',
    category: 'transport',
    fixedAmount: 6.00,
    isFixed: true
  },
  {
    id: 'lunch',
    title: '午餐',
    icon: '🍱',
    category: 'food',
    suggestedAmount: 16.82,
    isFixed: false
  },
  {
    id: 'dinner',
    title: '晚餐',
    icon: '🍙',
    category: 'food',
    suggestedAmount: 17.73,
    isFixed: false
  },
  {
    id: 'coffee',
    title: '瑞幸咖啡',
    icon: '☕',
    category: 'drink',
    suggestedAmount: 11.54,
    isFixed: false
  },
  {
    id: 'bread',
    title: '面包',
    icon: '🥖',
    category: 'daily',
    suggestedAmount: 14.90,
    isFixed: false
  },
  {
    id: 'subscription',
    title: 'AI订阅',
    icon: '📱',
    category: 'subscription',
    suggestedAmount: 16.53,
    isFixed: false
  }
];

export function QuickTransactionCard({ open, onOpenChange, onSuccess }: QuickTransactionCardProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [todayCategories, setTodayCategories] = useState<Set<string>>(new Set());
  const [loadingCategories, setLoadingCategories] = useState(false);

  // 获取今天的日期字符串
  const getTodayDateString = () => {
    return new Date().toISOString().slice(0, 10);
  };

  // 获取今天已记录的分类
  const fetchTodayCategories = async () => {
    setLoadingCategories(true);
    try {
      const today = getTodayDateString();

      const { data, error } = await supabase
        .from('transactions')
        .select('category')
        .eq('date', today)
        .is('deleted_at', null);

      if (error) {
        throw error;
      }

      const categories = new Set(data?.map(t => t.category) || []);
      setTodayCategories(categories);
    } catch (error) {
      console.error('获取今日分类失败:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 组件打开时获取今日分类
  useEffect(() => {
    if (open) {
      fetchTodayCategories();
    }
  }, [open]);

  // 处理金额输入
  const handleAmountChange = (itemId: string, value: string) => {
    // 只允许数字和小数点
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmounts(prev => ({
        ...prev,
        [itemId]: value
      }));
    }
  };

  // 处理快速记账
  const handleQuickTransaction = async (item: QuickTransactionItem) => {
    setSubmittingId(item.id);

    try {
      // 获取最终金额
      let finalAmount: number;
      if (item.isFixed) {
        finalAmount = item.fixedAmount!;
      } else {
        const customAmount = customAmounts[item.id];
        if (!customAmount || parseFloat(customAmount) <= 0) {
          alert('请输入有效金额');
          setSubmittingId(null);
          return;
        }
        finalAmount = parseFloat(customAmount);
      }

      const response = await fetch('/api/quick-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: item.category,
          amount: finalAmount,
          note: item.title,
          currency: 'CNY'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastTransaction(item.title);
        setShowToast(true);
        onSuccess?.();

        // 更新今日分类缓存
        setTodayCategories(prev => new Set(prev).add(item.category));

        // 清空该项目的自定义金额
        if (!item.isFixed) {
          setCustomAmounts(prev => {
            const newAmounts = { ...prev };
            delete newAmounts[item.id];
            return newAmounts;
          });
        }

        // 延迟关闭卡片
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        throw new Error('快速记账失败');
      }
    } catch (error) {
      console.error('快速记账失败:', error);
      alert('记账失败，请重试');
    } finally {
      setSubmittingId(null);
      setEditingId(null);
    }
  };

  // 渲染项目
  const renderItem = (item: QuickTransactionItem) => {
    const isSubmitting = submittingId === item.id;
    const isEditing = editingId === item.id;
    const currentAmount = customAmounts[item.id] || item.suggestedAmount?.toFixed(2) || '';
    const isRecordedToday = todayCategories.has(item.category);

    return (
      <motion.div
        key={item.id}
        className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all duration-300 ${
          isRecordedToday
            ? 'border-gray-200 bg-gray-50 opacity-75'
            : item.isFixed
            ? 'border-gradient-to-r from-green-200 to-emerald-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50 hover:from-green-100 hover:to-emerald-100 hover:shadow-green-200/50'
            : 'border-gradient-to-r from-blue-200 to-purple-200 bg-gradient-to-r from-blue-50/50 to-purple-50/50 hover:from-blue-100 hover:to-purple-100 hover:shadow-blue-200/50'
        } ${!isRecordedToday ? 'hover:shadow-lg cursor-pointer group' : ''}`}
        whileHover={!isRecordedToday ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isRecordedToday ? { scale: 0.98 } : {}}
      >
        {/* 左侧内容 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <motion.div
            className="text-3xl flex-shrink-0"
            whileHover={{ scale: 1.2, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {item.icon}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-base group-hover:text-transparent bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text transition-all duration-300">
              {item.title}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <span className={
                item.category === 'transport' ? 'text-green-600' :
                item.category === 'food' ? 'text-orange-600' :
                item.category === 'drink' ? 'text-blue-600' :
                item.category === 'daily' ? 'text-purple-600' :
                'text-gray-600'
              }>
                {item.category === 'transport' && '🚇 通勤'}
                {item.category === 'food' && '🍽️ 餐饮'}
                {item.category === 'drink' && '☕ 饮品'}
                {item.category === 'daily' && '🛍️ 日用品'}
                {item.category === 'subscription' && '📱 订阅'}
              </span>
              {isRecordedToday ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                  <FaCheck className="w-2.5 h-2.5" />
                  今日已记录
                </span>
              ) : item.isFixed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  固定价格
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 右侧金额和按钮 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {item.isFixed ? (
            <motion.div
              className="text-right"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xl font-bold text-green-600">
                ¥{item.fixedAmount?.toFixed(2)}
              </div>
              <div className="text-xs text-green-500">一键记录</div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Input
                    value={currentAmount}
                    onChange={(e) => handleAmountChange(item.id, e.target.value)}
                    placeholder="金额"
                    className="w-24 h-9 text-sm font-medium border-blue-200 focus:border-blue-400 focus:ring-blue-200"
                    autoFocus
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingId(null);
                        handleQuickTransaction(item);
                      }
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  className="text-right cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingId(item.id)}
                >
                  <div className="text-xl font-bold text-blue-600 flex items-center gap-1 justify-end">
                    ¥{currentAmount || '0.00'}
                    <Edit2 className="h-3.5 w-3.5 text-blue-500 opacity-70" />
                  </div>
                  <div className="text-xs text-blue-500">点击修改</div>
                </motion.div>
              )}
            </div>
          )}

          <motion.div
            whileHover={!isRecordedToday ? { scale: 1.05 } : {}}
            whileTap={!isRecordedToday ? { scale: 0.95 } : {}}
          >
            {isRecordedToday ? (
              <div className="min-w-[70px] h-10 flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <FaCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">已记录</span>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleQuickTransaction(item)}
                disabled={isSubmitting}
                className={`min-w-[70px] h-10 font-medium shadow-md hover:shadow-lg transition-all duration-200 ${
                  item.isFixed
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-green-200'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-blue-200'
                } text-white`}
              >
                {isSubmitting ? (
                  <motion.div
                    className="flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>记录中</span>
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>记录</span>
                  </motion.div>
                )}
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {showToast && (
            <ProgressToast
              message={`${lastTransaction} 记账成功！`}
              duration={2000}
              onClose={() => setShowToast(false)}
            />
          )}

          {/* 弹窗背景 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => onOpenChange(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

        {/* 卡片内容 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-100"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 -mx-6 px-6 -mt-6 pt-6 rounded-t-2xl">
              <CardTitle className="flex items-center gap-3 text-xl">
                <motion.div
                  animate={{
                    rotate: [0, -3, 3, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <div className="relative">
                    <FaRobot className="h-9 w-9 text-purple-600" />
                    {/* 可爱的眼睛效果 */}
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    {/* 微笑效果 */}
                    <div className="absolute bottom-2.5 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-white rounded-full opacity-90" />
                  </div>
                </motion.div>
                <div className="flex flex-col">
                  <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold text-lg">
                    小助手记账
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <FaHeart className="h-3 w-3 text-pink-500 animate-pulse" />
                    <span>让记账变得简单有趣</span>
                  </div>
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <motion.div
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 rounded-xl border border-pink-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <HiSparkles className="h-5 w-5 text-pink-500" />
                </motion.div>
                <div>
                  <span className="text-sm text-gray-700 font-semibold">
                    小助手帮你快速记账~
                  </span>
                  <div className="text-xs text-gray-500 mt-1">常用消费，一键记录 ✨</div>
                </div>
              </motion.div>

              <div className="space-y-3">
                {QUICK_ITEMS.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    {renderItem(item)}
                  </motion.div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => window.open('/add', '_blank')}
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    详细记账
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    关闭
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>固定价格项目点击直接记录</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                    <span>其他项目可点击金额修改后记录</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchTodayCategories}
                    disabled={loadingCategories}
                    className="text-gray-500 hover:text-gray-700 h-7 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingCategories ? 'animate-spin' : ''}`} />
                    刷新状态
                  </Button>
                  <div className="text-xs text-gray-400">
                    今日已记录 <span className="font-semibold text-gray-600">{todayCategories.size}</span> 个分类
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}