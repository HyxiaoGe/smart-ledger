import React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Wallet,
  Calendar,
  Plus,
  Settings2,
  PiggyBank,
  CreditCard,
  Tag,
  ChevronLeft,
  BarChart3
} from 'lucide-react';

export default function ExpensesSettingsPage() {
  const expenseConfigSections = [
    {
      title: '固定支出管理',
      description: '设置每月固定支出，如房租、水电费等，系统会自动生成记录',
      icon: Calendar,
      href: '/settings/expenses/recurring',
      status: 'available',
      badge: '核心功能',
      badgeColor: 'blue'
    },
    {
      title: '月度预算设置',
      description: '为不同消费类别设置月度预算上限，帮助控制支出',
      icon: PiggyBank,
      href: '/settings/expenses/budget',
      status: 'available',
      badge: 'NEW',
      badgeColor: 'green'
    },
    {
      title: '类别自定义',
      description: '添加个人专属的消费类别，自定义图标和颜色',
      icon: Tag,
      href: '/settings/expenses/categories',
      status: 'available',
      badge: 'NEW',
      badgeColor: 'green'
    },
    {
      title: '支付方式管理',
      description: '管理不同的支付账户，如信用卡、支付宝、微信等',
      icon: CreditCard,
      href: '/settings/expenses/payment-methods',
      status: 'available',
      badge: 'NEW',
      badgeColor: 'green'
    },
    {
      title: '每周消费报告',
      description: '查看每周自动生成的消费分析报告，洞察消费趋势和习惯',
      icon: BarChart3,
      href: '/settings/expenses/weekly-reports',
      status: 'available',
      badge: 'NEW',
      badgeColor: 'purple'
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <Breadcrumb
          items={[
            { label: '设置', href: '/settings' },
            { label: '消费配置' }
          ]}
          className="mb-6"
        />

        {/* 页面标题和描述 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">消费配置中心</h2>
          <p className="text-gray-600 dark:text-gray-300">
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
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-100'
                    }`}>
                      <section.icon className={`h-6 w-6 ${
                        section.status === 'available'
                          ? 'text-blue-600'
                          : 'text-gray-400 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        section.badgeColor === 'green'
                          ? 'bg-green-100 text-green-700'
                          : section.badgeColor === 'blue'
                          ? 'bg-blue-100 text-blue-600'
                          : section.badgeColor === 'purple'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600 dark:text-gray-300'
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
                  <Link href={section.href as Route}>
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

        </div>
    </div>
  );
}