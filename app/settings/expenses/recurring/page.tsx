import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Plus,
  Wallet,
  Clock,
  DollarSign,
  Settings2,
  ChevronLeft
} from 'lucide-react';

export default function RecurringExpensesPage() {
  const recurringExpenses = [
    {
      id: '1',
      name: '房租',
      amount: 3500,
      frequency: 'monthly',
      schedule: '每月1号',
      category: 'rent',
      nextDate: '2025-11-01',
      status: 'active'
    },
    {
      id: '2',
      name: '地铁费',
      amount: 6,
      frequency: 'weekly',
      schedule: '周一至周五',
      category: 'transport',
      nextDate: '2025-10-27',
      status: 'active'
    },
    {
      id: '3',
      name: '健身房',
      amount: 299,
      frequency: 'monthly',
      schedule: '每月15号',
      category: 'sport',
      nextDate: '2025-11-15',
      status: 'active'
    }
  ];

  const frequencyOptions = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月'
  };

  const categoryIcons = {
    rent: '🏠',
    transport: '🚇',
    sport: '💪',
    food: '🍽️',
    subscription: '📱',
    entertainment: '🎮',
    utilities: '💡'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题和操作按钮 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">固定支出管理</h2>
            <p className="text-gray-600">设置和管理您的定期固定支出，系统将自动生成记录</p>
          </div>
          <Link href="/settings/expenses/recurring/add">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              添加固定支出
            </Button>
          </Link>
        </div>
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{recurringExpenses.length}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">固定支出项目</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  ¥{recurringExpenses.reduce((sum, exp) => sum + exp.amount, 0)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">每月固定支出</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">3</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">本月待生成</p>
            </CardContent>
          </Card>
        </div>

        {/* 固定支出列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>固定支出列表</span>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                批量操作
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recurringExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {categoryIcons[expense.category] || '💰'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{expense.name}</div>
                      <div className="text-sm text-gray-500">
                        {frequencyOptions[expense.frequency]} · {expense.schedule}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        下次生成：{expense.nextDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">¥{expense.amount}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        expense.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {expense.status === 'active' ? '启用' : '暂停'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        编辑
                      </Button>
                      <Button variant="outline" size="sm">
                        {expense.status === 'active' ? '暂停' : '启用'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {recurringExpenses.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有固定支出</h3>
                <p className="text-gray-500 mb-4">
                  添加您的第一个固定支出，让记账更加自动化
                </p>
                <Link href="/settings/expenses/recurring/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    添加固定支出
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用提示 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">💡 使用提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 固定支出会在指定时间自动生成交易记录</li>
            <li>• 您可以随时暂停或启用任何固定支出项目</li>
            <li>• 系统会提前提醒即将生成的固定支出</li>
            <li>• 支持每日、每周、每月等多种频率设置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}