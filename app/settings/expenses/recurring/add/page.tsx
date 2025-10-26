import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Calendar,
  DollarSign,
  Tag,
  Clock,
  ChevronLeft
} from 'lucide-react';

export default function AddRecurringExpensePage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">添加固定支出</h2>
          <p className="text-gray-600">设置定期自动生成的支出项目，让记账更加自动化</p>
        </div>

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
                    placeholder="例如：房租、地铁费、健身房会员"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    金额 (元) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    消费类别 *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每月日期
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        每月{i + 1}号
                      </option>
                    ))}
                  </select>
                </div>

                {/* 周度设置（当选择周度时显示） */}
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
                          className="mr-1"
                        />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
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
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    结束日期（可选）
                  </label>
                  <input
                    type="date"
                    placeholder="不填写则永久有效"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                创建固定支出
              </Button>
              <Link href="/settings/expenses/recurring">
                <Button variant="outline" className="flex-1">
                  取消
                </Button>
              </Link>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 快速模板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">快速模板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: '房租', amount: 3500, frequency: 'monthly', day: 1 },
                  { name: '地铁费', amount: 6, frequency: 'weekly', days: [1,2,3,4,5] },
                  { name: '健身房', amount: 299, frequency: 'monthly', day: 15 }
                ].map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // 这里应该填充表单
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500">
                        ¥{template.amount} · {template.frequency === 'monthly' ? `每月${template.day}号` : '工作日'}
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* 使用提示 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base text-blue-900">💡 使用提示</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• 固定支出会在指定时间自动生成</li>
                  <li>• 可以随时暂停或启用固定支出</li>
                  <li>• 支持多种重复频率设置</li>
                  <li>• 系统会提前提醒即将生成的支出</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}