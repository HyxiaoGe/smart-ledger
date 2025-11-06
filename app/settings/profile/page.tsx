import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  ChevronLeft
} from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回设置中心
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">个人信息设置</h2>
          <p className="text-gray-600 dark:text-gray-300">管理您的个人资料和账户信息</p>
        </div>

        {/* 敬请期待提示 */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:border-blue-800 dark:border-blue-800 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100 dark:text-blue-100">
              <User className="h-5 w-5" />
              敬请期待
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-lg text-blue-900 dark:text-blue-100 dark:text-blue-100 mb-4">个人信息管理功能正在开发中</div>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                我们正在构建一个完整的个人信息管理系统，让您能够更好地管理个人资料和账户设置。
              </p>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">即将支持的功能</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">👤 基本信息管理</h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>• 用户名和头像设置</li>
                        <li>• 联系方式管理</li>
                        <li>• 个人简介编辑</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🌍 地理位置设置</h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>• 所在地区设置</li>
                        <li>• 时区和日期格式</li>
                        <li>• 货币单位选择</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🔒 隐私与安全</h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>• 账户安全设置</li>
                        <li>• 隐私选项管理</li>
                        <li>• 登录设备管理</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🔔 通知偏好</h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>• 邮件通知设置</li>
                        <li>• 系统消息管理</li>
                        <li>• 数据统计偏好</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使用提示 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 dark:text-blue-100 mb-2">💡 开发提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
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