'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/ProgressToast';
import { DateInput } from '@/components/DateInput';
import {
  Edit3,
  Calendar,
  DollarSign,
  Clock,
  ChevronLeft
} from 'lucide-react';

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_config: Record<string, any>;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  last_generated?: string;
  next_generate?: string;
}

export default function EditRecurringExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    frequency: 'monthly',
    frequency_config: { day_of_month: 1 },
    start_date: null,
    end_date: null
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
  useEffect(() => {
    if (id) {
      fetchExpense();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recurring-expenses/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
        } else {
          throw new Error('获取固定支出详情失败');
        }
        return;
      }

      const data: RecurringExpense = await response.json();
      setFormData({
        name: data.name,
        amount: data.amount.toString(),
        category: data.category,
        frequency: data.frequency,
        frequency_config: data.frequency_config,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null
      });
    } catch (error) {
      console.error('获取固定支出详情失败:', error);
      setError('获取固定支出详情失败');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        amount: amount,
        category: formData.category,
        frequency: formData.frequency,
        frequency_config: formData.frequency_config,
        start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
      };

      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }

      setToastMessage('固定支出更新成功！');
      setShowToast(true);
      setTimeout(() => {
        router.push('/settings/expenses/recurring');
      }, 2000);
    } catch (error) {
      console.error('更新固定支出失败:', error);
      setToastMessage(error instanceof Error ? error.message : '更新固定支出失败');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/recurring">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回固定支出管理
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/recurring">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/recurring">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回固定支出管理
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={fetchExpense}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses/recurring">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回固定支出管理
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">编辑固定支出</h2>
          <p className="text-gray-600">修改固定支出的设置，只影响未来的生成记录</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 表单区域 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      支出名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      金额 (元) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      消费类别 *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">请选择类别</option>
                      {categoryOptions.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.icon} {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* 时间设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    时间设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始日期 *
                    </label>
                    <DateInput
                      selected={formData.start_date}
                      onSelect={(date) => handleDateChange('start_date', date)}
                      placeholder="选择开始日期"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束日期（可选）
                    </label>
                    <DateInput
                      selected={formData.end_date}
                      onSelect={(date) => handleDateChange('end_date', date)}
                      placeholder="选择结束日期（可选）"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      不填写则永久有效
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 频率设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    频率设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      重复频率 *
                    </label>
                    <div className="space-y-3">
                      {frequencyOptions.map((frequency) => (
                        <label key={frequency.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="frequency"
                            value={frequency.value}
                            checked={formData.frequency === frequency.value}
                            onChange={(e) => handleInputChange('frequency', e.target.value)}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{frequency.label}</div>
                            <div className="text-sm text-gray-500">{frequency.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 月度设置（当选择月度时显示） */}
                  {formData.frequency === 'monthly' && (
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        每月日期
                      </label>
                      <select
                        value={formData.frequency_config.day_of_month}
                        onChange={(e) => handleFrequencyConfigChange('day_of_month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        星期设置
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                          <label key={index} className="flex items-center justify-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
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
                              className="mr-1"
                            />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={saving}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {saving ? '保存中...' : '保存修改'}
                </Button>
                <Link href="/settings/expenses/recurring">
                  <Button type="button" variant="outline" className="flex-1">
                    取消
                  </Button>
                </Link>
              </div>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 提示信息 */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base text-blue-900">💡 编辑说明</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• 修改只影响未来的生成记录</li>
                    <li>• 历史记录不会发生变化</li>
                    <li>• 下次生成时间会重新计算</li>
                    <li>• 可以随时暂停或恢复</li>
                  </ul>
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