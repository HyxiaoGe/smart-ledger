import React from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  SettingsFeatureGrid,
  type SettingsFeatureItem,
} from '@/components/shared/SettingsFeatureGrid';
import {
  Calendar,
  PiggyBank,
  CreditCard,
  Tag,
  BarChart3,
  FileText
} from 'lucide-react';

export default function ExpensesSettingsPage() {
  const expenseConfigSections: SettingsFeatureItem[] = [
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
      description: '查看每周消费分析报告，专注于日常可控消费的趋势分析',
      icon: BarChart3,
      href: '/settings/expenses/weekly-reports',
      status: 'available',
      badge: '可控消费',
      badgeColor: 'purple'
    },
    {
      title: '月度财务报告',
      description: '查看月度完整财务报告，包含固定支出和日常消费的全面分析',
      icon: FileText,
      href: '/settings/expenses/monthly-reports',
      status: 'available',
      badge: 'NEW',
      badgeColor: 'green'
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
        <SettingsFeatureGrid
          items={expenseConfigSections}
          accentTone="blue"
          columnsClassName="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12"
        />

        </div>
    </div>
  );
}
