import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Wallet,
  Brain,
  Bell,
  Database,
  ChevronRight,
  Settings,
  Clock
} from 'lucide-react';

export default function SettingsPage() {
  const configSections = [
    {
      title: '个人信息设置',
      description: '管理个人资料和账户信息',
      icon: User,
      href: '/settings/profile',
      comingSoon: true
    },
    {
      title: '消费配置',
      description: '固定支出、预算设置、类别管理',
      icon: Wallet,
      href: '/settings/expenses',
      comingSoon: false
    },
    {
      title: 'AI分析配置',
      description: '分析偏好、提醒规则、个性化设置',
      icon: Brain,
      href: '/settings/ai-analysis',
      comingSoon: true
    },
    {
      title: '通知设置',
      description: '预算提醒、账单提醒、异常通知',
      icon: Bell,
      href: '/settings/notifications',
      comingSoon: true
    },
    {
      title: '数据管理',
      description: '数据备份、导入导出、隐私设置',
      icon: Database,
      href: '/settings/data',
      comingSoon: true
    },
    {
      title: '定时任务管理',
      description: '查看和管理系统自动化任务、执行历史',
      icon: Clock,
      href: '/settings/system/cron',
      comingSoon: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">设置中心</h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">配置您的智能记账系统，让财务管理更加个性化和高效</p>
        </div>

        {/* 配置模块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configSections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      section.comingSoon
                        ? 'bg-gray-100'
                        : section.title === '消费配置'
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : section.title === '定时任务管理'
                        ? 'bg-purple-100 dark:bg-purple-900'
                        : 'bg-gradient-to-r from-blue-100 to-purple-100'
                    }`}>
                      <section.icon className={`h-6 w-6 ${
                        section.comingSoon
                          ? 'text-gray-400'
                          : section.title === '消费配置'
                          ? 'text-blue-600'
                          : section.title === '定时任务管理'
                          ? 'text-purple-600'
                          : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {section.comingSoon && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:text-gray-400 mt-1">
                          即将推出
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
                  {section.description}
                </p>
                {section.comingSoon ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    敬请期待
                  </Button>
                ) : (
                  <Link href={section.href}>
                    <Button
                      variant={section.title === '消费配置' || section.title === '定时任务管理' ? 'default' : 'outline'}
                      className={`w-full ${section.title === '定时任务管理' ? 'bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600' : ''}`}
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      进入配置
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 快速操作区域 */}
        <div className="mt-12">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800 dark:border-blue-800 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100 dark:text-blue-100 dark:text-blue-300">
                <Brain className="h-5 w-5" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/settings/expenses">
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                    <Wallet className="h-8 w-8 text-blue-600" />
                    <span className="text-sm">添加固定支出</span>
                  </Button>
                </Link>
                <Button variant="outline" disabled className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                  <span className="text-sm">设置提醒</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">即将推出</span>
                </Button>
                <Button variant="outline" disabled className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Database className="h-8 w-8 text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                  <span className="text-sm">数据备份</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">即将推出</span>
                </Button>
                <Button variant="outline" disabled className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <User className="h-8 w-8 text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                  <span className="text-sm">个人资料</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">即将推出</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 使用提示 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
            💡 提示：点击进入各个配置模块，根据您的个人需求自定义智能记账系统
          </p>
        </div>
      </div>
    </div>
  );
}