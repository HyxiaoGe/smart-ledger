'use client';

import React, { useState, useEffect } from 'react';
import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { CheckCircle, X, Edit2, RefreshCw } from 'lucide-react';
import { FaRobot, FaCheck, FaHeart } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/clients/supabase/client';
import { formatDateToLocal } from '@/lib/utils/date';
import { getPaymentMethodsWithStats, type PaymentMethod } from '@/lib/services/paymentMethodService';

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
    suggestedAmount: 12.90,
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
  const [todayItems, setTodayItems] = useState<Set<string>>(new Set());
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // 获取今天的日期字符串
  const getTodayDateString = () => {
    return formatDateToLocal(new Date());
  };

  // 获取今天已记录的分类和具体项目
  const fetchTodayCategories = async () => {
    setLoadingCategories(true);
    try {
      const today = getTodayDateString();

      const { data, error } = await supabase
        .from('transactions')
        .select('category, note')
        .eq('date', today)
        .is('deleted_at', null);

      if (error) {
        throw error;
      }

      const categories = new Set(data?.map(t => t.category) || []);
      setTodayCategories(categories);

      // 获取今天已记录的具体项目（基于note匹配）
      const items = new Set<string>();
      data?.forEach(transaction => {
        // 根据note匹配具体的项目
        const matchedItem = QUICK_ITEMS.find(item => {
          // 精确匹配标题
          if (transaction.note === item.title) {
            return true;
          }

          // 智能模糊匹配 - 支持包含关键词
          if (transaction.note) {
            // 检查是否包含项目标题的核心关键词
            const keywords = {
              'lunch': ['午餐', '午饭', '午饭'],
              'dinner': ['晚餐', '晚饭', '晚餐'],
              'subway': ['地铁', '通勤', '地铁'],
              'coffee': ['咖啡', '瑞幸', '咖啡'],
              'bread': ['面包', '烘焙', '面包'],
              'subscription': ['订阅', '会员', '订阅']
            };

            const itemKeywords = keywords[item.id as keyof typeof keywords] || [item.title];
            return itemKeywords.some(keyword =>
              transaction.note.includes(keyword) ||
              keyword.includes(transaction.note)
            );
          }

          return false;
        });

        if (matchedItem) {
          items.add(matchedItem.id);
        }
      });
      setTodayItems(items);
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

  // 加载支付方式列表
  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const methods = await getPaymentMethodsWithStats();
        setPaymentMethods(methods);
        // 设置默认支付方式
        const defaultMethod = methods.find(m => m.is_default);
        if (defaultMethod) {
          setPaymentMethod(defaultMethod.id);
        }
      } catch (err) {
        console.error('加载支付方式失败:', err);
      }
    }
    loadPaymentMethods();
  }, []);

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
        // 如果用户没有输入金额，使用建议金额
        if (!customAmount || customAmount.trim() === '') {
          if (item.suggestedAmount && item.suggestedAmount > 0) {
            finalAmount = item.suggestedAmount;
          } else {
            alert('请输入有效金额');
            setSubmittingId(null);
            return;
          }
        } else {
          const parsedAmount = parseFloat(customAmount);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('请输入有效金额');
            setSubmittingId(null);
            return;
          }
          finalAmount = parsedAmount;
        }
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
          currency: 'CNY',
          paymentMethod: paymentMethod || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastTransaction(item.title);
        setShowToast(true);
        onSuccess?.();

        // 更新今日分类缓存
        setTodayCategories(prev => new Set(prev).add(item.category));

        // 更新今日项目缓存
        setTodayItems(prev => new Set(prev).add(item.id));

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
    const isRecordedToday = todayItems.has(item.id);

    return (
      <motion.div
        key={item.id}
        className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all duration-300 ${
          item.isFixed
            ? 'border-gradient-to-r from-green-200 to-emerald-200 dark:from-green-800 dark:to-emerald-800 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/50 dark:to-emerald-950/50 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/80 dark:hover:to-emerald-900/80 hover:shadow-green-200/50 dark:hover:shadow-green-900/50'
            : 'border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/50 dark:to-purple-950/50 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/80 dark:hover:to-purple-900/80 hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50'
        } hover:shadow-lg cursor-pointer group`}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
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
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-base group-hover:text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text transition-all duration-300">
              {item.title}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium">
                  <FaCheck className="w-2.5 h-2.5" />
                  今日已记录
                </span>
              ) : item.isFixed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
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
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                ¥{item.fixedAmount?.toFixed(2)}
              </div>
              <div className="text-xs text-green-500 dark:text-green-400">一键记录</div>
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
                    className="w-24 h-9 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-800"
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
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 justify-end">
                    ¥{currentAmount || '0.00'}
                    <Edit2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 opacity-70" />
                  </div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">点击修改</div>
                </motion.div>
              )}
            </div>
          )}

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
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
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-100 dark:border-gray-700"
        >
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 dark:from-pink-950 dark:via-purple-950 dark:to-indigo-950 -mx-6 px-6 -mt-6 pt-6 rounded-t-2xl">
              <CardTitle className="flex items-center gap-3">
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
                    <FaRobot className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    {/* 可爱的眼睛效果 */}
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white dark:bg-gray-200 rounded-full animate-pulse" />
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white dark:bg-gray-200 rounded-full animate-pulse" />
                    {/* 微笑效果 */}
                    <div className="absolute bottom-2.5 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-white dark:bg-gray-200 rounded-full opacity-90" />
                  </div>
                </motion.div>
                <div className="flex flex-col">
                  <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold text-lg">
                    小助手记账
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <FaHeart className="h-3 w-3 text-pink-500 animate-pulse" />
                    <span>让记账变得简单有趣</span>
                  </div>
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6 pt-4">
              {/* 状态统计卡片 */}
              <div className="grid grid-cols-3 gap-3">
                <motion.div
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{todayItems.size}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">已记录项目</div>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl p-3 text-center border border-green-200 dark:border-green-800"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{QUICK_ITEMS.length - todayItems.size}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">待记录项目</div>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-3 text-center border border-purple-200 dark:border-purple-800"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round((todayItems.size / QUICK_ITEMS.length) * 100)}%
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">完成进度</div>
                </motion.div>
              </div>

              {/* 支付方式选择 */}
              <motion.div
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-100 dark:border-green-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm font-medium text-green-700 dark:text-green-300">
                    支付方式：
                  </label>
                  <select
                    className="flex-1 h-9 rounded-md border border-green-200 dark:border-green-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-green-500 focus:ring-green-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">未设置</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}{pm.is_default ? ' (默认)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>

              {/* 提示信息 */}
              <motion.div
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-lg border border-indigo-100 dark:border-indigo-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <HiSparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                </motion.div>
                <div className="flex-1">
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                    {todayItems.size > 0 ? '今日记录很棒！' : '开始记账吧！'}
                  </div>
                  <div className="text-xs text-indigo-500 dark:text-indigo-400">
                    {todayItems.size > 0
                      ? '还有其他快捷记账选项可以继续使用'
                      : '常用消费，一键记录 ✨'
                    }
                  </div>
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

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => {
                        window.location.href = '/add';
                      }, 300);
                    }}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    详细记账
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    关闭
                  </Button>
                </div>
              </div>

              {/* 底部操作区域 */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                      <span>固定价格</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                      <span>可修改金额</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchTodayCategories}
                    disabled={loadingCategories}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 h-7 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingCategories ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
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