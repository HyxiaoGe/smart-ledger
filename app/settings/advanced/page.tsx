import React from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SettingsFeatureGrid } from '@/components/shared/SettingsFeatureGrid';
import { SettingsInfoPanel } from '@/components/shared/SettingsInfoPanel';
import {
  Clock,
  Settings2,
  Sparkles,
  Server,
  Database,
  FileText
} from 'lucide-react';

export default function AdvancedSettingsPage() {
  const advancedConfigSections = [
    {
      title: '定时任务管理',
      description: '查看和管理系统自动化任务、执行历史、手动触发任务',
      icon: Clock,
      href: '/settings/advanced/cron' as const,
      status: 'available',
      badge: '核心功能',
      badgeColor: 'purple'
    },
    {
      title: '函数管理',
      description: '了解系统所有业务功能，查看每个函数的作用和使用场景',
      icon: Database,
      href: '/settings/advanced/functions' as const,
      status: 'available',
      badge: 'NEW',
      badgeColor: 'green'
    },
    {
      title: '系统日志',
      description: '查看和分析系统运行日志、API 请求、用户操作、错误记录等',
      icon: FileText,
      href: '/settings/advanced/logs' as const,
      status: 'available',
      badge: 'NEW',
      badgeColor: 'blue'
    },
    {
      title: '系统维护',
      description: '数据库清理、缓存管理等系统维护功能',
      icon: Server,
      href: '/settings/advanced/maintenance' as const,
      status: 'coming-soon',
      badge: '即将推出',
      badgeColor: 'gray'
    },
    {
      title: 'AI 高级设置',
      description: '自定义 AI 模型参数、提示词优化、分析策略调整',
      icon: Sparkles,
      href: '/settings/advanced/ai' as const,
      status: 'coming-soon',
      badge: '即将推出',
      badgeColor: 'gray'
    }
  ] as const;


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <Breadcrumb
          items={[
            { label: '设置', href: '/settings' },
            { label: '高级配置' }
          ]}
          className="mb-6"
        />

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
        <SettingsFeatureGrid
          items={advancedConfigSections}
          accentTone="purple"
          columnsClassName="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12"
        />

        {/* 提示信息 */}
        <SettingsInfoPanel
          title="💡 关于高级配置"
          description="高级配置提供系统级别的管理功能，包括定时任务自动化、系统维护工具和 AI 参数调优。这些功能帮助您更好地管理和优化智能记账系统的运行。"
          icon={Sparkles}
          tone="purple"
        />
      </div>
    </div>
  );
}
