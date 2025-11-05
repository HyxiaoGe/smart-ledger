'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  Download,
  Upload,
  Shield,
  HardDrive,
  RefreshCw,
  FileText,
  Lock,
  Clock,
  CheckCircle,
  ChevronLeft
} from 'lucide-react';

export default function DataSettingsPage() {
  const dataFeatures = [
    {
      title: '数据备份',
      description: '自动或手动备份您的财务数据',
      icon: HardDrive,
      status: 'coming-soon'
    },
    {
      title: '数据导入导出',
      description: '支持Excel、CSV等格式的数据交换',
      icon: FileText,
      status: 'coming-soon'
    },
    {
      title: '数据归档',
      description: '管理长时间跨度的历史数据',
      icon: Clock,
      status: 'coming-soon'
    },
    {
      title: '隐私设置',
      description: '数据匿名化和敏感信息保护',
      icon: Shield,
      status: 'coming-soon'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回设置中心
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">数据管理</h2>
          <p className="text-gray-600 dark:text-gray-400">管理您的数据，确保财务信息安全可靠</p>
        </div>

        {/* 数据概览 */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <Database className="h-5 w-5" />
              数据概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">1,247</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">交易记录</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">156</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">分析报告</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">100%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">备份状态</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">5.2MB</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">数据大小</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据管理功能 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {dataFeatures.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      feature.status === 'available'
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <feature.icon className={`h-6 w-6 ${
                        feature.status === 'available'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 dark:text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>
                {feature.status === 'available' ? (
                  <Button className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    管理设置
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    敬请期待
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 开发进度 */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <RefreshCw className="h-5 w-5" />
              开发进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-lg text-purple-900 dark:text-purple-300 mb-4">数据管理系统正在完善中</div>
              <p className="text-purple-700 dark:text-purple-400 mb-6">
                我们正在构建一个完整的数据管理系统，让您完全掌控自己的财务数据。
              </p>
              <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">开发计划</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">自动备份</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">每日自动备份到云端</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">数据导入导出</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">支持Excel/CSV格式</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">数据归档</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">历史数据管理</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">隐私保护</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">数据匿名化处理</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" disabled className="h-auto p-4 flex flex-col items-center gap-2">
                <HardDrive className="h-8 w-8 text-gray-400" />
                <span className="text-sm">立即备份</span>
                <span className="text-xs text-gray-500">开发中</span>
              </Button>
              <Button variant="outline" disabled className="h-auto p-4 flex flex-col items-center gap-2">
                <Download className="h-8 w-8 text-gray-400" />
                <span className="text-sm">导出数据</span>
                <span className="text-xs text-gray-500">开发中</span>
              </Button>
              <Button variant="outline" disabled className="h-auto p-4 flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm">导入数据</span>
                <span className="text-xs text-gray-500">开发中</span>
              </Button>
              <Button variant="outline" disabled className="h-auto p-4 flex flex-col items-center gap-2">
                <Shield className="h-8 w-8 text-gray-400" />
                <span className="text-sm">隐私设置</span>
                <span className="text-xs text-gray-500">开发中</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 数据安全 */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-300">
              <Lock className="h-5 w-5" />
              数据安全
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">端到端加密</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">所有数据传输均采用SSL加密</div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">本地存储</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">敏感数据本地加密存储</div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">定期备份</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">自动备份策略保护数据安全</div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">权限控制</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">严格的数据访问权限管理</div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使用提示 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">💡 数据安全建议</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• 定期备份重要数据，避免数据丢失</li>
            <li>• 使用强密码并定期更换</li>
            <li>• 不要在不安全的设备上登录账户</li>
            <li>• 定期检查和清理不必要的旧数据</li>
            <li>• 了解并合理设置隐私保护选项</li>
          </ul>
        </div>
      </div>
    </div>
  );
}