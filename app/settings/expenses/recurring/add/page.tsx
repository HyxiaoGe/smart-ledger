'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { SettingsCalloutCard } from '@/components/shared/SettingsCalloutCard';
import { DateInput } from '@/components/features/input/DateInput';
import { BackNavigation } from '@/components/layout/BackNavigation';
import { recurringExpensesApi } from '@/lib/api/services/recurring-expenses';
import { ApiError } from '@/lib/api/client';
import { formatDateToLocal } from '@/lib/utils/date';
import {
  Plus,
  Calendar,
  DollarSign,
  Tag,
  Clock,
  ChevronLeft,
  Pause
} from 'lucide-react';

export default function AddRecurringExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeDateInput, setActiveDateInput] = useState<string | null>(null);
  const prefillAppliedRef = useRef(false);
  const [formData, setFormData] = useState<{
    name: string;
    amount: string;
    category: string;
    frequency: string;
    frequency_config: { day_of_month?: number; days_of_week?: number[] };
    start_date: Date | null;
    end_date: Date | null;
    skip_holidays: boolean;
  }>({
    name: '',
    amount: '',
    category: '',
    frequency: 'monthly',
    frequency_config: { day_of_month: 1 },
    start_date: null,
    end_date: null,
    skip_holidays: false
  });

  // 创建定期支出 mutation
  const createMutation = useMutation({
    mutationFn: recurringExpensesApi.create,
    onSuccess: () => {
      setToastMessage('固定支出创建成功！');
      setShowToast(true);
      setTimeout(() => {
        router.push('/settings/expenses/recurring');
      }, 2000);
    },
    onError: (error: ApiError) => {
      setToastMessage(error.message || '创建固定支出失败');
      setShowToast(true);
    },
  });

  // 客户端初始化
  useEffect(() => {
    setMounted(true);
    if (prefillAppliedRef.current) return;

    const name = searchParams.get('name') || '';
    const category = searchParams.get('category') || '';
    const amount = searchParams.get('amount') || '';
    const frequency = searchParams.get('frequency') || '';
    const dayOfMonth = searchParams.get('day_of_month');
    const daysOfWeek = searchParams.get('days_of_week');
    const skipHolidays = searchParams.get('skip_holidays') === '1';

    const parsedDaysOfWeek = daysOfWeek
      ? daysOfWeek
          .split(',')
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day))
      : undefined;

    setFormData(prev => ({
      ...prev,
      name: name || prev.name,
      amount: amount || prev.amount,
      category: category || prev.category,
      frequency: frequency || prev.frequency,
      frequency_config: {
        ...prev.frequency_config,
        ...(dayOfMonth ? { day_of_month: Number(dayOfMonth) } : {}),
        ...(parsedDaysOfWeek && parsedDaysOfWeek.length > 0 ? { days_of_week: parsedDaysOfWeek } : {}),
      },
      start_date: prev.start_date || new Date(),
      skip_holidays: skipHolidays || prev.skip_holidays,
    }));

    prefillAppliedRef.current = true;
  }, [searchParams]);

  const categoryOptions = [
    { value: 'rent', label: '房租', icon: '🏠' },
    { value: 'transport', label: '交通', icon: '🚇' },
    { value: 'food', label: '餐饮', icon: '🍽️' },
    { value: 'sport', label: '运动', icon: '💪' },
    { value: 'subscription', label: '订阅服务', icon: '📱' },
    { value: 'entertainment', label: '娱乐', icon: '🎮' },
    { value: 'utilities', label: '水电费', icon: '💡' },
    { value: 'medical', label: '医疗', icon: '💊' },
    { value: 'education', label: '教育', icon: '📚' },
    { value: 'other', label: '其他', icon: '💰' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: '每日', description: '每天都会生成' },
    { value: 'weekly', label: '每周', description: '按周设置，可选择具体星期' },
    { value: 'monthly', label: '每月', description: '按月设置，可选择具体日期' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (field: 'start_date' | 'end_date', date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const handleFrequencyConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      frequency_config: {
        ...prev.frequency_config,
        [key]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!formData.name || !formData.amount || !formData.category) {
      setToastMessage('请填写必填字段');
      setShowToast(true);
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setToastMessage('请输入有效的金额');
      setShowToast(true);
      return;
    }

    createMutation.mutate({
      name: formData.name,
      amount: amount,
      category: formData.category,
      frequency: formData.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
      frequency_config: formData.frequency_config,
      start_date: formData.start_date ? formatDateToLocal(formData.start_date) : formatDateToLocal(new Date()),
      end_date: formData.end_date ? formatDateToLocal(formData.end_date) : null,
      skip_holidays: formData.skip_holidays,
      is_active: true
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-gray-500 dark:text-gray-400">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* 返回导航 */}
        <BackNavigation
          href="/settings/expenses/recurring"
          title="返回固定支出管理"
          variant="default"
        />

        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">添加固定支出</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            设置定期自动生成的支出项目，让您无需重复手动记账，享受智能化的财务管理体验
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 表单区域 */}
            <div className="space-y-8 relative">
              {/* 基本信息 */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-full"></div>
                      支出名称 *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="例如：房租、地铁费、健身房会员"
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                        required
                      />
                      <div className="absolute right-3 top-3 text-gray-400 dark:text-gray-400">
                        <Tag className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-green-50 dark:bg-green-950 dark:bg-green-950 rounded-full"></div>
                      金额 (元) *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 font-medium">
                        ¥
                      </div>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all text-lg font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-50 dark:bg-purple-950 dark:bg-purple-950 rounded-full"></div>
                      消费类别 *
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all appearance-none bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm cursor-pointer"
                        required
                      >
                        <option value="">请选择类别</option>
                        {categoryOptions.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3 text-gray-400 dark:text-gray-400 pointer-events-none">
                        <Tag className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间设置 */}
              <Card className="border-0 shadow-lg relative z-[60]">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    时间设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                      开始日期 *
                    </label>
                    <div className="relative z-[10001] w-full">
                      <DateInput
                        selected={formData.start_date ?? undefined}
                        onSelect={(date) => handleDateChange('start_date', date)}
                        placeholder="选择开始日期"
                        className="w-full"
                        containerZIndex={10001}
                        inputId="start-date"
                        isActive={activeDateInput === 'start-date'}
                        onOpen={(id) => setActiveDateInput(id)}
                        onClose={() => setActiveDateInput(null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-50 dark:bg-orange-950 dark:bg-orange-950 rounded-full"></div>
                      结束日期（可选）
                    </label>
                    <div className="relative z-[10000] w-full">
                      <DateInput
                        selected={formData.end_date ?? undefined}
                        onSelect={(date) => handleDateChange('end_date', date)}
                        placeholder="选择结束日期（可选）"
                        className="w-full"
                        containerZIndex={10000}
                        inputId="end-date"
                        isActive={activeDateInput === 'end-date'}
                        onOpen={(id) => setActiveDateInput(id)}
                        onClose={() => setActiveDateInput(null)}
                      />
                    </div>
                    <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-950 dark:bg-orange-950 rounded-full"></div>
                        不填写则永久有效
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 频率设置 */}
              <Card className="border-0 shadow-lg relative z-20">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    频率设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-50 dark:bg-purple-950 dark:bg-purple-950 rounded-full"></div>
                      重复频率 *
                    </label>
                    <div className="space-y-3">
                      {frequencyOptions.map((frequency) => (
                        <label
                          key={frequency.value}
                          className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            formData.frequency === frequency.value
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 ring-2 ring-purple-200'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:bg-purple-950/50'
                          }`}
                        >
                          <div className="relative">
                            <input
                              type="radio"
                              name="frequency"
                              value={frequency.value}
                              checked={formData.frequency === frequency.value}
                              onChange={(e) => handleInputChange('frequency', e.target.value)}
                              className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            {formData.frequency === frequency.value && (
                              <div className="absolute inset-0 rounded-full bg-purple-600 opacity-20"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-semibold ${
                              formData.frequency === frequency.value ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {frequency.label}
                            </div>
                            <div className={`text-sm mt-1 ${
                              formData.frequency === frequency.value ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {frequency.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 月度设置（当选择月度时显示） */}
                  {formData.frequency === 'monthly' && (
                    <div className="border-t dark:border-gray-700 border-purple-200 dark:border-purple-800 pt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-1 h-4 bg-pink-500 rounded-full"></div>
                        每月日期
                      </label>
                            <select
                        value={formData.frequency_config.day_of_month}
                        onChange={(e) => handleFrequencyConfigChange('day_of_month', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all appearance-none bg-white dark:bg-gray-800 hover:border-pink-300 dark:hover:border-pink-600 hover:shadow-sm cursor-pointer"
                      >
                        {[...Array(31)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            每月{i + 1}号
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 周度设置（当选择周度时显示） */}
                  {formData.frequency === 'weekly' && (
                    <div className="border-t dark:border-gray-700 border-purple-200 dark:border-purple-800 pt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        星期设置
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                          <label
                            key={index}
                            className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                              formData.frequency_config.days_of_week?.includes(index)
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={index}
                              checked={formData.frequency_config.days_of_week?.includes(index) || false}
                              onChange={(e) => {
                                const days = formData.frequency_config.days_of_week || [];
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('days_of_week', [...days, index]);
                                } else {
                                  handleFrequencyConfigChange('days_of_week', days.filter((d: number) => d !== index));
                                }
                              }}
                              className="sr-only"
                            />
                            <span className={`text-sm font-medium ${
                              formData.frequency_config.days_of_week?.includes(index)
                                ? 'text-indigo-900'
                                : 'text-gray-700'
                            }`}>
                              {day}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t dark:border-gray-700 border-purple-200 dark:border-purple-800 pt-6">
                    <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.skip_holidays}
                        onChange={(e) => handleInputChange('skip_holidays', e.target.checked)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                      />
                      节假日不生成（适用于通勤类支出）
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      仅在法定节假日跳过生成，不影响周末设置。
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  disabled={createMutation.isPending}
                >
                  <div className="flex items-center justify-center gap-2">
                    {createMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                    <span>{createMutation.isPending ? '创建中...' : '创建固定支出'}</span>
                  </div>
                </Button>
                <Link href="/settings/expenses/recurring">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-3 px-6 rounded-xl font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
                  >
                    取消
                  </Button>
                </Link>
              </div>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 快速模板 */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    快速模板
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: '房租', amount: '1400', frequency: 'monthly', day: 1, color: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900', icon: '🏠' },
                    { name: '地铁通勤', amount: '6', frequency: 'weekly', days: [1,2,3,4,5], color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900', icon: '🚇' },
                    { name: '健身房', amount: '299', frequency: 'monthly', day: 15, color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900', icon: '💪' }
                  ].map((template, index) => (
                    <div
                      key={index}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${template.color} group`}
                      onClick={() => {
                        setFormData({
                          name: template.name,
                          amount: template.amount,
                          category: template.name === '房租' ? 'rent' : template.name === '地铁通勤' ? 'transport' : 'sport',
                          frequency: template.frequency,
                          frequency_config: template.frequency === 'monthly'
                            ? { day_of_month: template.day }
                            : { days_of_week: template.days },
                          start_date: new Date(),
                          end_date: null,
                          skip_holidays: template.name === '地铁通勤'
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            {template.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {template.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                              {template.frequency === 'monthly' ? `每月${template.day}号` : '工作日'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            ¥{template.amount}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            自动填充
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t dark:border-gray-700 border-gray-200">
                        <div className="flex items-center justify-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
                            点击应用模板
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 使用提示 */}
              <SettingsCalloutCard title="使用提示" tone="blue">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        固定支出会在指定时间自动生成，无需手动重复记账
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Pause className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        可以随时暂停或启用固定支出，灵活控制
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        支持多种重复频率设置，满足不同需求
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Calendar className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        系统会提前提醒即将生成的支出，帮助您做好财务规划
                      </p>
                    </div>
                  </div>
              </SettingsCalloutCard>
            </div>
          </div>
        </form>

        {/* Toast提示 */}
        {showToast && (
          <ProgressToast
            message={toastMessage}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  );
}
