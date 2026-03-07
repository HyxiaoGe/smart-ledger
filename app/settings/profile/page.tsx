import React from 'react';

import { Bell, MapPin, Shield, User } from 'lucide-react';

import {
  SettingsActionGrid,
  type SettingsActionItem,
} from '@/components/shared/SettingsActionGrid';
import { SettingsBackButton } from '@/components/shared/SettingsBackButton';
import { SettingsCalloutCard } from '@/components/shared/SettingsCalloutCard';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SettingsTipsPanel } from '@/components/shared/SettingsTipsPanel';

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

        <SettingsCalloutCard title="敬请期待" icon={User} tone="blue" className="mb-8">
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
                    itemClassName="w-full h-auto min-h-[112px] p-4 flex flex-col items-center gap-2"
                  />
                </div>
              </div>
            </div>
        </SettingsCalloutCard>

        <SettingsTipsPanel
          title="💡 开发提示"
          items={[
            '• 个人信息管理功能即将上线',
            '• 将支持完整的用户资料编辑功能',
            '• 重视用户隐私和数据安全',
            '• 敬请期待更多个性化设置选项',
          ]}
        />
      </div>
    </div>
  );
}
