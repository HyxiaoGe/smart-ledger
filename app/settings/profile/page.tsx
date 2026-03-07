import React from 'react';

import { Bell, MapPin, Shield, User } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SettingsActionGrid,
  type SettingsActionItem,
} from '@/components/shared/SettingsActionGrid';
import { SettingsBackButton } from '@/components/shared/SettingsBackButton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';

export default function ProfileSettingsPage() {
  const upcomingFeatures: SettingsActionItem[] = [
    {
      title: '基本信息管理',
      icon: User,
      status: 'coming-soon',
      description: '用户名、头像、简介',
    },
    {
      title: '地理位置设置',
      icon: MapPin,
      status: 'coming-soon',
      description: '地区、时区、货币单位',
    },
    {
      title: '隐私与安全',
      icon: Shield,
      status: 'coming-soon',
      description: '安全设置、隐私选项',
    },
    {
      title: '通知偏好',
      icon: Bell,
      status: 'coming-soon',
      description: '邮件通知和消息管理',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsBackButton />

        <SettingsPageHeader
          title="个人信息设置"
          description="管理您的个人资料和账户信息"
          icon={User}
          tone="blue"
        />

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:border-blue-800 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <User className="h-5 w-5" />
              敬请期待
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-lg text-blue-900 dark:text-blue-100 mb-4">
                个人信息管理功能正在开发中
              </div>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                我们正在构建一个完整的个人信息管理系统，让您能够更好地管理个人资料和账户设置。
              </p>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                    即将支持的功能
                  </h4>
                  <SettingsActionGrid
                    items={upcomingFeatures}
                    columnsClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 开发提示</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 个人信息管理功能即将上线</li>
            <li>• 将支持完整的用户资料编辑功能</li>
            <li>• 重视用户隐私和数据安全</li>
            <li>• 敬请期待更多个性化设置选项</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
