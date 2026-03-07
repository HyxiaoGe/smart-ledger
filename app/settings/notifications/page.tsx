'use client';

import React from 'react';

import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  Smartphone,
  Volume2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SettingsActionGrid,
  type SettingsActionItem,
} from '@/components/shared/SettingsActionGrid';
import { SettingsBackButton } from '@/components/shared/SettingsBackButton';
import { SettingsCalloutCard } from '@/components/shared/SettingsCalloutCard';
import {
  SettingsFeatureGrid,
  type SettingsFeatureItem,
} from '@/components/shared/SettingsFeatureGrid';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SettingsTipsPanel } from '@/components/shared/SettingsTipsPanel';

export default function NotificationsSettingsPage() {
  const notificationTypes: SettingsFeatureItem[] = [
    {
      title: '预算提醒',
      description: '当消费接近预算上限时发送提醒',
      icon: AlertTriangle,
      status: 'coming-soon',
    },
    {
      title: '账单提醒',
      description: '固定支出到期前的智能提醒',
      icon: Calendar,
      status: 'coming-soon',
    },
    {
      title: '异常通知',
      description: '检测到异常大额消费时立即通知',
      icon: Volume2,
      status: 'coming-soon',
    },
    {
      title: '周报/月报',
      description: '定期发送消费分析报告',
      icon: Mail,
      status: 'coming-soon',
    },
  ];

  const channels: SettingsActionItem[] = [
    { title: '应用内通知', icon: Smartphone, status: 'coming-soon', description: '默认渠道' },
    { title: '邮件通知', icon: Mail, status: 'coming-soon', description: '开发中' },
    { title: '提醒节奏', icon: Clock, status: 'coming-soon', description: '智能调度' },
    { title: '异常预警', icon: AlertTriangle, status: 'coming-soon', description: '开发中' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsBackButton />

        <SettingsPageHeader
          title="通知设置"
          description="配置各类通知提醒，及时掌握您的财务动态"
          icon={Bell}
          tone="green"
        />

        <SettingsCalloutCard title="通知状态" icon={CheckCircle} tone="green" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">活跃通知</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400 dark:text-gray-400">4</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">待配置</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">通知服务</div>
              </div>
            </div>
        </SettingsCalloutCard>

        <SettingsFeatureGrid
          items={notificationTypes}
          accentTone="blue"
          columnsClassName="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          availableActionLabel="配置设置"
        />

        <SettingsCalloutCard title="开发进度" icon={Bell} tone="orange">
            <div className="text-center py-6">
              <div className="text-lg text-orange-900 dark:text-orange-300 mb-4">
                通知系统正在开发中
              </div>
              <p className="text-orange-700 dark:text-orange-300 mb-6">
                我们正在构建一个智能通知系统，帮助您更好地管理财务。
              </p>
              <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">预计功能特性</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">📧 多渠道通知</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <li>• 邮件通知</li>
                      <li>• 应用内推送</li>
                      <li>• 短信提醒（可选）</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">⏰ 智能提醒</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <li>• 预算超支预警</li>
                      <li>• 消费异常检测</li>
                      <li>• 个性化提醒时间</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </SettingsCalloutCard>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              通知示例
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                ['预算超支提醒', '2025-10-26 15:30', 'border-blue-500', '您的餐饮支出已达本月预算的85%，建议控制剩余消费。已消费：¥2,550 / 预算：¥3,000'],
                ['固定支出提醒', '2025-11-01 09:00', 'border-orange-500', '您的房租（¥3,500）将在1天后到期，请确保账户余额充足。'],
                ['异常消费提醒', '2025-10-26 20:45', 'border-red-500', '检测到异常大额消费：¥1,200，超出日常消费水平。请确认是否为正常支出。'],
                ['周报通知', '2025-10-27 09:00', 'border-green-500', '本周消费总额：¥1,850，较上周减少15%。趋势良好，继续保持！'],
              ].map(([title, timestamp, borderClassName, description]) => (
                <div key={title} className={`border-l-4 ${borderClassName} pl-4 py-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              推送设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SettingsActionGrid
              items={channels}
              columnsClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">通知渠道</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">应用内通知</span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      defaultChecked
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">邮件通知</span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">短信通知</span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled
                    />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">免打扰时段</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      夜间免打扰 (22:00-08:00)
                    </span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      defaultChecked
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">周末免打扰</span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">通知频率</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      紧急通知
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      异常消费、账户安全等
                    </div>
                  </div>
                  <select className="px-3 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer">
                    <option>立即</option>
                    <option>延迟5分钟</option>
                    <option>延迟15分钟</option>
                    <option>延迟1小时</option>
                  </select>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <SettingsTipsPanel
          title="💡 使用提示"
          items={[
            '• 合理设置通知频率，避免通知过频繁',
            '• 重要通知建议开启多个渠道，确保不会遗漏',
            '• 利用免打扰功能保护您的休息时间',
            '• 定期检查通知设置，确保符合您的需求',
          ]}
        />
      </div>
    </div>
  );
}
