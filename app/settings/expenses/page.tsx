import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Calendar,
  Plus,
  Settings2,
  PiggyBank,
  CreditCard,
  Tag,
  ChevronLeft
} from 'lucide-react';

export default function ExpensesSettingsPage() {
  const expenseConfigSections = [
    {
      title: '固定支出管理',
      description: '设置每月固定支出，如房租、水电费等，系统会自动生成记录',
      icon: Calendar,
      href: '/settings/expenses/recurring',
      status: 'available',
      badge: '核心功能'
    },
    {
      title: '月度预算设置',
      description: '为不同消费类别设置月度预算上限，帮助控制支出',
      icon: PiggyBank,
      href: '/settings/expenses/budget',
      status: 'coming-soon',
      badge: '即将推出'
    },
    {
      title: '类别自定义',
      description: '添加个人专属的消费类别，自定义图标和颜色',
      icon: Tag,
      href: '/settings/expenses/categories',
      status: 'coming-soon',
      badge: '即将推出'
    },
    {
      title: '支付方式管理',
      description: '管理不同的支付账户，如信用卡、支付宝、微信等',
      icon: CreditCard,
      href: '/settings/expenses/payment-methods',
      status: 'coming-soon',
      badge: '即将推出'
    }
  ];

  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回设置中心
            </Button>
          </Link>
        </div>

        {/* 页面标题和描述 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">消费配置中心</h2>
          <p className="text-gray-600">
            个性化您的消费管理体验，让智能记账更符合您的生活习惯
          </p>
        </div>

        {/* 配置模块 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {expenseConfigSections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      section.status === 'available'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      <section.icon className={`h-6 w-6 ${
                        section.status === 'available'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        section.status === 'available'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
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
                    <Button className="w-full">
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

        </div>
    </div>
  );
}