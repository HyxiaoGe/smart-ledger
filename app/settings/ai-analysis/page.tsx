import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Settings,
  Clock,
  Target,
  Zap,
  TrendingUp,
  Lightbulb,
  ChevronLeft
} from 'lucide-react';

export default function AIAnalysisSettingsPage() {
  const aiFeatures = [
    {
      title: '智能分析配置',
      description: '自定义AI分析的频率和深度',
      icon: Brain,
      status: 'coming-soon'
    },
    {
      title: '提醒规则设置',
      description: '设置消费异常提醒的触发条件',
      icon: Clock,
      status: 'coming-soon'
    },
    {
      title: '个性化偏好',
      description: '调整AI模型的个人化参数',
      icon: Settings,
      status: 'coming-soon'
    },
    {
      title: '数据源配置',
      description: '选择和分析的数据源范围',
      icon: Target,
      status: 'coming-soon'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回设置中心
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI分析配置</h2>
          <p className="text-gray-600">个性化您的智能分析体验，让AI更好地为您服务</p>
        </div>

        {/* 功能概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {aiFeatures.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <Button variant="outline" disabled className="w-full">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    敬请期待
                  </span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 开发中提示 */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Lightbulb className="h-5 w-5" />
              开发进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-blue-900">智能分析配置</div>
                  <div className="text-sm text-blue-700">正在进行UI设计和功能规划</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-blue-600">开发中</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-blue-900">提醒规则设置</div>
                  <div className="text-sm text-blue-700">功能设计和数据库架构已完成</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-blue-600">规划中</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-blue-900">个性化偏好</div>
                  <div className="text-sm text-blue-700">正在收集用户需求和反馈</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-blue-600">需求收集中</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-blue-900">数据源配置</div>
                  <div className="text-sm text-blue-700">功能规划阶段</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <span className="text-sm text-blue-600">待开始</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预期功能 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              预期功能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">分析频率控制</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 实时分析：每次消费后立即分析</li>
                  <li>• 每日分析：每日固定时间汇总分析</li>
                  <li>• 每周分析：每周生成深度报告</li>
                  <li>• 自定义分析：用户自定义分析时间</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">智能提醒</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 消费异常提醒：超出预算时通知</li>
                  <li>• 趋势变化提醒：消费习惯改变时提醒</li>
                  <li>• 固定支出提醒：固定支出到期前提醒</li>
                  <li>• 个性化建议：基于AI的建议推送</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">分析偏好</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 关注的消费类别</li>
                  <li>• 分析深度（简单/详细/深度）</li>
                  <li>• 预测模型的选择</li>
                  <li>• 报告格式偏好</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">数据管理</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 分析数据保留时间</li>
                  <li>• 数据导出格式选择</li>
                  <li>• 隐私保护级别</li>
                  <li>• 数据同步设置</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 反馈收集 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">💬 需求反馈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-blue-800 mb-4">
                您希望AI分析功能包含哪些特性？您的反馈对我们很重要！
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" className="bg-white">
                  <Zap className="h-4 w-4 mr-2" />
                  提交建议
                </Button>
                <Button variant="outline" className="bg-white">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  功能投票
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}