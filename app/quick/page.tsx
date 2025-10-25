"use client";
import React from 'react';
import { QuickTransaction } from '@/components/QuickTransaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Zap, Plus, BarChart3, Home } from 'lucide-react';

export default function QuickPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-orange-500" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">快速记账</h1>
                <p className="text-sm text-gray-500">基于AI的智能快速记账，让记账更简单</p>
              </div>
            </div>

            {/* 导航按钮 */}
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-1" />
                  首页
                </Button>
              </Link>
              <Link href="/add">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  详细记账
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  数据分析
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：快速记账 */}
          <div className="lg:col-span-2">
            <QuickTransaction
              onSuccess={() => {
                // 快速记账成功后的回调
              }}
            />
          </div>

          {/* 右侧：使用指南 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 使用指南 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  使用指南
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">AI智能建议</div>
                      <div className="text-sm text-gray-500">
                        基于当前时间和历史数据，AI会智能推荐最可能的消费项目
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">一键快速记账</div>
                      <div className="text-sm text-gray-500">
                        点击"快速记账"按钮，即可立即记录消费，无需填写详细信息
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">自动智能分类</div>
                      <div className="text-sm text-gray-500">
                        系统自动识别消费类别和金额，确保数据准确性
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                      <Zap className="h-4 w-4" />
                      智能提示
                    </div>
                    <div className="text-xs text-blue-600">
                      快速记账适用于日常高频消费，如午餐、咖啡、通勤等。对于特殊消费，建议使用详细记账功能。
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 快速统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  今日快速记账
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">快速记账次数</span>
                    <span className="font-semibold text-gray-900">0 次</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">快速记账金额</span>
                    <span className="font-semibold text-gray-900">¥0.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">节省时间</span>
                    <span className="font-semibold text-green-600">~0 分钟</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link href="/analytics">
                    <Button variant="outline" size="sm" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      查看详细分析
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 功能说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI预测原理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">时间模式识别</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">历史数据分析</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">消费行为学习</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700">智能金额预测</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  AI预测基于您的个人历史数据，越使用越准确。所有数据处理均在本地进行，确保您的隐私安全。
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}