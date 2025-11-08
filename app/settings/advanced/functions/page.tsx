'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Sparkles,
  Settings,
  Info
} from 'lucide-react';
import {
  getFunctionsByCategory,
  getCategoryStats,
  searchFunctions,
  type FunctionInfo
} from '@/lib/services/functionService';

export default function FunctionsManagementPage() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['business']);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<FunctionInfo | null>(null);

  const stats = getCategoryStats();
  const functionsByCategory = getFunctionsByCategory();
  const searchResults = searchKeyword ? searchFunctions(searchKeyword) : null;

  // 切换分类展开/收起
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 获取分类配置
  const getCategoryConfig = (category: string) => {
    const configs = {
      business: {
        title: '核心业务功能',
        icon: Database,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        borderColor: 'border-blue-200 dark:border-blue-800',
        description: '增删改操作'
      },
      query: {
        title: '数据查询分析',
        icon: BarChart3,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800',
        description: '统计和报表'
      },
      ai: {
        title: 'AI 智能助手',
        icon: Sparkles,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950',
        borderColor: 'border-purple-200 dark:border-purple-800',
        description: '预测和建议'
      },
      maintenance: {
        title: '系统维护',
        icon: Settings,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
        borderColor: 'border-orange-200 dark:border-orange-800',
        description: '维护和监控'
      }
    };
    return configs[category as keyof typeof configs];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/advanced">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              返回高级配置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Database className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">数据库函数管理</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            了解系统的所有业务功能，查看每个函数是做什么的、在哪里使用
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.business}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">核心业务功能</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">增删改操作</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.query}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">数据查询分析</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">统计和报表</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.ai}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">AI 智能助手</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">预测和建议</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索栏 */}
        <Card className="mb-6 border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索函数名称、功能描述..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* 搜索结果或分类列表 */}
        {searchResults ? (
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">
                搜索结果 ({searchResults.length} 个)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  未找到匹配的函数
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((func) => (
                    <FunctionCard
                      key={func.name}
                      func={func}
                      onViewDetail={() => setSelectedFunction(func)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(functionsByCategory).map(([category, functions]) => {
              const config = getCategoryConfig(category);
              const isExpanded = expandedCategories.includes(category);
              const Icon = config.icon;

              return (
                <Card key={category} className="border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config.iconColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                            {config.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {config.description} • {functions.length} 个函数
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {functions.map((func) => (
                          <FunctionCard
                            key={func.name}
                            func={func}
                            onViewDetail={() => setSelectedFunction(func)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* 说明信息 */}
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-sm text-purple-900 dark:text-purple-100">
              <p className="font-medium mb-1">💡 关于数据库函数</p>
              <p className="text-purple-700 dark:text-purple-300">
                这些函数是系统的核心业务逻辑，负责处理数据的增删改查、统计分析和 AI 智能功能。
                了解这些函数能帮助你更好地理解系统是如何工作的。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 函数详情弹窗 */}
      {selectedFunction && (
        <FunctionDetailModal
          func={selectedFunction}
          onClose={() => setSelectedFunction(null)}
        />
      )}
    </div>
  );
}

// 函数卡片组件
function FunctionCard({ func, onViewDetail }: { func: FunctionInfo; onViewDetail: () => void }) {
  const getCategoryColor = (category: string) => {
    const colors = {
      business: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      query: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      ai: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
      maintenance: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
    };
    return colors[category as keyof typeof colors];
  };

  return (
    <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors bg-gray-50 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{func.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(func.category)}`}>
              {func.category === 'business' && '业务'}
              {func.category === 'query' && '查询'}
              {func.category === 'ai' && 'AI'}
              {func.category === 'maintenance' && '维护'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{func.summary}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <code className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">{func.name}</code>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onViewDetail}
          className="flex-shrink-0"
        >
          <Info className="h-4 w-4 mr-1" />
          了解更多
        </Button>
      </div>
    </div>
  );
}

// 函数详情弹窗组件
function FunctionDetailModal({ func, onClose }: { func: FunctionInfo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {func.title}
              </h3>
              <code className="text-sm text-gray-500 dark:text-gray-400">{func.name}</code>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 简单来说 */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              💬 简单来说
            </h4>
            <p className="text-gray-700 dark:text-gray-300">{func.summary}</p>
          </div>

          {/* 解决什么问题 */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              🎯 解决什么问题
            </h4>
            <p className="text-gray-700 dark:text-gray-300">{func.purpose}</p>
          </div>

          {/* 使用场景 */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              ✨ 什么时候会用到
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {func.useCases.map((useCase, index) => (
                <li key={index}>{useCase}</li>
              ))}
            </ul>
          </div>

          {/* 在哪里使用 */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              📍 在哪里用到
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {func.usedIn.map((location, index) => (
                <li key={index}>{location}</li>
              ))}
            </ul>
          </div>

          {/* 需要的信息 */}
          {func.requiredInfo && func.requiredInfo.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                📝 需要提供的信息
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {func.requiredInfo.map((info, index) => (
                  <li key={index}>{info}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6">
          <Button onClick={onClose} className="w-full">
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
