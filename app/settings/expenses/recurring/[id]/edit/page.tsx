'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { DateInput } from '@/components/features/input/DateInput';
import { BackNavigation } from '@/components/layout/BackNavigation';
import { recurringExpensesApi, type RecurringExpense } from '@/lib/api/services/recurring-expenses';
import { ApiError } from '@/lib/api/client';
import { formatDateToLocal } from '@/lib/utils/date';
import {
  Edit3,
  Calendar,
  DollarSign,
  Clock,
  ChevronLeft,
  Tag,
  Pause,
  History
} from 'lucide-react';

export default function EditRecurringExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeDateInput, setActiveDateInput] = useState<string | null>(null);

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

  // 获取固定支出详情
  const { data: expenseData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['recurring-expense', id],
    queryFn: () => recurringExpensesApi.get(id),
    enabled: !!id,
  });

  // 当数据加载完成后填充表单
  useEffect(() => {
    if (expenseData) {
      setFormData({
        name: expenseData.name,
        amount: expenseData.amount.toString(),
        category: expenseData.category,
        frequency: expenseData.frequency,
        frequency_config: expenseData.frequency_config || { day_of_month: 1 },
        start_date: expenseData.start_date ? new Date(expenseData.start_date) : null,
        end_date: expenseData.end_date ? new Date(expenseData.end_date) : null,
        skip_holidays: expenseData.skip_holidays ?? false
      });
    }
  }, [expenseData]);

  // 更新 mutation
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof recurringExpensesApi.update>[1]) =>
      recurringExpensesApi.update(id, data),
    onSuccess: () => {
      setToastMessage('固定支出更新成功！');
      setShowToast(true);
      setTimeout(() => {
        router.push('/settings/expenses/recurring');
      }, 2000);
    },
    onError: (error: ApiError) => {
      setToastMessage(error.message || '更新固定支出失败');
      setShowToast(true);
    },
  });

  const notFound = fetchError instanceof ApiError && fetchError.status === 404;
  const error = fetchError && !notFound ? (fetchError as ApiError).message || '获取固定支出详情失败' : null;

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

    updateMutation.mutate({
      name: formData.name,
      amount: amount,
      category: formData.category,
      frequency: formData.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
      frequency_config: formData.frequency_config,
      start_date: formData.start_date ? formatDateToLocal(formData.start_date) : formatDateToLocal(new Date()),
      end_date: formData.end_date ? formatDateToLocal(formData.end_date) : null,
      skip_holidays: formData.skip_holidays,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackNavigation
            href="/settings/expenses/recurring"
            title="返回固定支出管理"
            variant="default"
          />
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/recurring">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
                返回固定支出管理
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">固定支出不存在</div>
            <Link href="/settings/expenses/recurring">
              <Button>返回列表</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/recurring">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
                返回固定支出管理
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Link href="/settings/expenses/recurring">
              <Button>返回列表</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <BackNavigation
          href="/settings/expenses/recurring"
          title="返回固定支出管理"
          variant="default"
        />

        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4 shadow-lg">
            <Edit3 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">编辑固定支出</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            修改固定支出的设置，这些更改将只影响未来的生成记录，不会影响已创建的历史记录
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 表单区域 */}
            <div className="space-y-6">
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
                      <div className="w-1 h-4 bg-blue-50 dark:bg-blue-950 dark:bg-blue-9500 rounded-full"></div>
                      支出名称 *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                        required
                      />
                      <div className="absolute right-3 top-3 text-gray-400 dark:text-gray-500">
                        <Edit3 className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-green-50 dark:bg-green-950 dark:bg-green-9500 rounded-full"></div>
                      金额 (元) *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-3 text-gray-500 font-medium">
                        ¥
                      </div>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 transition-all text-lg font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-50 dark:bg-purple-950 dark:bg-purple-9500 rounded-full"></div>
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
                      <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                        <Tag className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间设置 */}
              <Card className="border-0 shadow-lg">
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
                    <DateInput
                      selected={formData.start_date ?? undefined}
                      onSelect={(date) => handleDateChange('start_date', date)}
                      placeholder="选择开始日期"
                      className="w-full"
                      inputId="edit-start-date"
                      isActive={activeDateInput === 'edit-start-date'}
                      onOpen={(id) => setActiveDateInput(id)}
                      onClose={() => setActiveDateInput(null)}
                      containerZIndex={10001}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-50 dark:bg-orange-950 dark:bg-orange-9500 rounded-full"></div>
                      结束日期（可选）
                    </label>
                    <DateInput
                      selected={formData.end_date ?? undefined}
                      onSelect={(date) => handleDateChange('end_date', date)}
                      placeholder="选择结束日期（可选）"
                      className="w-full"
                      inputId="edit-end-date"
                      isActive={activeDateInput === 'edit-end-date'}
                      onOpen={(id) => setActiveDateInput(id)}
                      onClose={() => setActiveDateInput(null)}
                      containerZIndex={10000}
                    />
                    <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-950 dark:bg-orange-9500 rounded-full"></div>
                        不填写则永久有效
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 频率设置 */}
              <Card className="border-0 shadow-lg">
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
                      <div className="w-1 h-4 bg-purple-50 dark:bg-purple-950 dark:bg-purple-9500 rounded-full"></div>
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
                    <div className="border-t dark:border-gray-700 border-purple-200 dark:border-purple-800 dark:border-purple-800 pt-6">
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
                    <div className="border-t dark:border-gray-700 border-purple-200 dark:border-purple-800 dark:border-purple-800 pt-6">
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
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  disabled={updateMutation.isPending}
                >
                  <div className="flex items-center justify-center gap-2">
                    {updateMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit3 className="h-5 w-5" />
                    )}
                    <span>{updateMutation.isPending ? '保存中...' : '保存修改'}</span>
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
              {/* 编辑说明 */}
              <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950 dark:via-gray-800 dark:to-indigo-950">
                <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 border-b dark:border-gray-700 border-blue-200 dark:border-blue-800">
                  <CardTitle className="text-base text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg">
                      <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    编辑说明
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        修改后的设置只会影响未来的生成记录，不会改变已创建的历史记录
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Calendar className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        系统会根据新设置重新计算下次生成时间
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Pause className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        可以随时暂停或恢复固定支出的自动生成
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <History className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        之前的记录保持不变，确保数据完整性
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
