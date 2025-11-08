import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Settings2,
  ChevronLeft,
  Sparkles,
  Server,
  Database
} from 'lucide-react';

export default function AdvancedSettingsPage() {
  const advancedConfigSections = [
    {
      title: '定时任务管理',
      description: '查看和管理系统自动化任务、执行历史、手动触发任务',
      icon: Clock,
      href: '/settings/advanced/cron',
      status: 'available',
      badge: '核心功能',
      badgeColor: 'purple'
    },
    {
      title: '函数管理',
      description: '了解系统所有业务功能，查看每个函数的作用和使用场景',
      icon: Database,
      href: '/settings/advanced/functions',
      status: 'available',
      badge: 'NEW',
      badgeColor: 'green'
    },
    {
      title: '系统维护',
      description: '数据库清理、缓存管理、日志查看等系统维护功能',
      icon: Server,
      href: '/settings/advanced/maintenance',
      status: 'coming-soon',
      badge: '即将推出',
      badgeColor: 'gray'
    },
    {
      title: 'AI 高级设置',
      description: '自定义 AI 模型参数、提示词优化、分析策略调整',
      icon: Sparkles,
      href: '/settings/advanced/ai',
      status: 'coming-soon',
      badge: '即将推出',
      badgeColor: 'gray'
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回设置中心
            </Button>
          </Link>
        </div>

        {/* 页面标题和描述 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Settings2 className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">高级配置中心</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            管理系统高级功能，包括定时任务、函数管理、系统维护和 AI 高级设置
          </p>
        </div>

        {/* 配置模块 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {advancedConfigSections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      section.status === 'available'
                        ? 'bg-purple-100 dark:bg-purple-900'
                        : 'bg-gray-100'
                    }`}>
                      <section.icon className={`h-6 w-6 ${
                        section.status === 'available'
                          ? 'text-purple-600'
                          : 'text-gray-400 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        section.badgeColor === 'purple'
                          ? 'bg-purple-100 text-purple-700'
                          : section.badgeColor === 'green'
                          ? 'bg-green-100 text-green-700'
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
                  <Link href={section.href}>
                    <Button className="w-full bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600">
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

        {/* 提示信息 */}
        <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-sm text-purple-900 dark:text-purple-100">
              <p className="font-medium mb-1">💡 关于高级配置</p>
              <p className="text-purple-700 dark:text-purple-300">
                高级配置提供系统级别的管理功能，包括定时任务自动化、系统维护工具和 AI 参数调优。
                这些功能帮助您更好地管理和优化智能记账系统的运行。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
