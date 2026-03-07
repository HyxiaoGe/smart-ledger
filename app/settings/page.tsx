import React from 'react';

import { Brain, Bell, Database, Settings, User, Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SettingsActionGrid,
  type SettingsActionItem,
} from '@/components/shared/SettingsActionGrid';
import {
  SettingsFeatureGrid,
  type SettingsFeatureItem,
} from '@/components/shared/SettingsFeatureGrid';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';

export default function SettingsPage() {
  const configSections: SettingsFeatureItem[] = [
    {
      title: '个人信息设置',
      description: '管理个人资料和账户信息',
      icon: User,
      href: '/settings/profile',
      status: 'coming-soon',
      badge: '即将推出',
      badgeTone: 'gray',
    },
    {
      title: '消费配置',
      description: '固定支出、预算设置、类别管理',
      icon: Wallet,
      href: '/settings/expenses',
      status: 'available',
      badge: '核心模块',
      badgeTone: 'blue',
    },
    {
      title: 'AI分析配置',
      description: '分析偏好、提醒规则、个性化设置',
      icon: Brain,
      href: '/settings/ai-analysis',
      status: 'coming-soon',
      badge: '规划中',
      badgeTone: 'gray',
    },
    {
      title: '通知设置',
      description: '预算提醒、账单提醒、异常通知',
      icon: Bell,
      href: '/settings/notifications',
      status: 'coming-soon',
      badge: '规划中',
      badgeTone: 'gray',
    },
    {
      title: '数据管理',
      description: '数据备份、导入导出、隐私设置',
      icon: Database,
      href: '/settings/data',
      status: 'coming-soon',
      badge: '规划中',
      badgeTone: 'gray',
    },
    {
      title: '高级配置',
      description: '定时任务管理、系统维护、高级功能设置',
      icon: Settings,
      href: '/settings/advanced',
      status: 'available',
      badge: '系统级',
      badgeTone: 'purple',
    },
  ];

  const quickActions: SettingsActionItem[] = [
    {
      title: '添加固定支出',
      icon: Wallet,
      href: '/settings/expenses',
      status: 'available',
      tone: 'blue',
    },
    {
      title: '设置提醒',
      icon: Bell,
      status: 'coming-soon',
      description: '即将推出',
    },
    {
      title: '数据备份',
      icon: Database,
      status: 'coming-soon',
      description: '即将推出',
    },
    {
      title: '个人资料',
      icon: User,
      status: 'coming-soon',
      description: '即将推出',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsPageHeader
          title="设置中心"
          description="配置您的智能记账系统，让财务管理更加个性化和高效"
          icon={Settings}
          tone="blue"
        />

        <SettingsFeatureGrid
          items={configSections}
          accentTone="blue"
          columnsClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          availableActionLabel="进入配置"
        />

        <div className="mt-12">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                <Brain className="h-5 w-5" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsActionGrid items={quickActions} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 提示：点击进入各个配置模块，根据您的个人需求自定义智能记账系统
          </p>
        </div>
      </div>
    </div>
  );
}
