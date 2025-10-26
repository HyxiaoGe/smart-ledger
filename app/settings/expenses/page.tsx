import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Calendar,
  Plus,
  Settings2,
  PiggyBank,
  CreditCard,
  Tag
} from 'lucide-react';

export default function ExpensesSettingsPage() {
  const expenseConfigSections = [
    {
      title: '固定支出管理',
      description: '设置每月固定支出，如房租、水电费等，系统会自动生成记录',
      icon: Calendar,
      href: '/settings/expenses/recurring',
      status: 'available',
      badge: '核心功能'
    },
    {
      title: '月度预算设置',
      description: '为不同消费类别设置月度预算上限，帮助控制支出',
      icon: PiggyBank,
      href: '/settings/expenses/budget',
      status: 'coming-soon',
      badge: '即将推出'
    },
    {
      title: '类别自定义',
      description: '添加个人专属的消费类别，自定义图标和颜色',
      icon: Tag,
      href: '/settings/expenses/categories',
      status: 'coming-soon',
      badge: '即将推出'
    },
    {
      title: '支付方式管理',
      description: '管理不同的支付账户，如信用卡、支付宝、微信等',
      icon: CreditCard,
      href: '/settings/expenses/payment-methods',
      status: 'coming-soon',
      badge: '即将推出'
    }
  ];

  const recurringExpenseExamples = [
    { name: '房租', amount: 3500, frequency: '每月1号', category: '住房' },
    { name: '地铁费', amount: 6, frequency: '工作日', category: '交通' },
    { name: '健身房', amount: 299, frequency: '每月15号', category: '运动' },
    { name: 'Netflix订阅', amount: 68, frequency: '每月5号', category: '娱乐' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和描述 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">消费配置中心</h2>
          <p className="text-gray-600">
            个性化您的消费管理体验，让智能记账更符合您的生活习惯
          </p>
        </div>

        {/* 配置模块 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {expenseConfigSections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      section.status === 'available'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      <section.icon className={`h-6 w-6 ${
                        section.status === 'available'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        section.status === 'available'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {section.badge}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {section.description}
                </p>
                {section.status === 'available' ? (
                  <Link href={section.href}>
                    <Button className="w-full">
                      <Settings2 className="h-4 w-4 mr-2" />
                      开始配置
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    <Settings2 className="h-4 w-4 mr-2" />
                    敬请期待
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 固定支出示例 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Calendar className="h-5 w-5" />
              固定支出示例
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurringExpenseExamples.map((expense, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Wallet className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{expense.name}</div>
                      <div className="text-sm text-gray-500">{expense.frequency}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">¥{expense.amount}</div>
                    <div className="text-xs text-gray-500">{expense.category}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>提示：</strong>设置固定支出后，系统会在指定时间自动创建消费记录，
                让您无需手动重复输入，提升记账效率。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 快速开始 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              快速开始
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                还没有配置固定支出？点击下方按钮开始设置您的第一个固定支出
              </p>
              <Link href="/settings/expenses/recurring">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-5 w-5 mr-2" />
                  添加固定支出
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}