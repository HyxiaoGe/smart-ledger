'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionIntro } from '@/components/shared/SectionIntro';
import { SettingsBackButton } from '@/components/shared/SettingsBackButton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import {
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getFunctionsByCategory,
  getCategoryStats,
  searchFunctions,
  type FunctionInfo
} from '@/lib/services/functionService';
import { FUNCTION_CATEGORY_CONFIG, getFunctionCategoryConfig } from './utils';
import { SettingsInfoPanel } from '@/components/shared/SettingsInfoPanel';

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsBackButton href="/settings/advanced" label="返回高级配置" />

        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-gradient-to-r from-purple-50 via-white to-fuchsia-50 p-6 shadow-sm dark:border-slate-800 dark:from-purple-950 dark:via-slate-950 dark:to-fuchsia-950">
          <SettingsPageHeader
            title="数据库函数管理"
            description="按业务、查询和 AI 分类梳理数据库函数，方便快速理解系统能力。"
            icon={Database}
            tone="purple"
          />
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-sky-50 to-blue-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-sky-950/30 dark:to-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.business}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{FUNCTION_CATEGORY_CONFIG.business.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{FUNCTION_CATEGORY_CONFIG.business.description}</div>
                </div>
                <div className={`p-3 rounded-lg ${FUNCTION_CATEGORY_CONFIG.business.bgColor}`}>
                  <Database className={`h-6 w-6 ${FUNCTION_CATEGORY_CONFIG.business.iconColor} dark:text-blue-400`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-emerald-50 to-green-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/30 dark:to-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.query}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{FUNCTION_CATEGORY_CONFIG.query.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{FUNCTION_CATEGORY_CONFIG.query.description}</div>
                </div>
                <div className={`p-3 rounded-lg ${FUNCTION_CATEGORY_CONFIG.query.bgColor}`}>
                  <BarChart3 className={`h-6 w-6 ${FUNCTION_CATEGORY_CONFIG.query.iconColor} dark:text-green-400`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/70 bg-gradient-to-br from-white via-violet-50 to-purple-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-violet-950/30 dark:to-purple-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.ai}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{FUNCTION_CATEGORY_CONFIG.ai.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{FUNCTION_CATEGORY_CONFIG.ai.description}</div>
                </div>
                <div className={`p-3 rounded-lg ${FUNCTION_CATEGORY_CONFIG.ai.bgColor}`}>
                  <Sparkles className={`h-6 w-6 ${FUNCTION_CATEGORY_CONFIG.ai.iconColor} dark:text-purple-400`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索栏 */}
        <Card className="mb-6 border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <SectionIntro
              eyebrow="Function Search"
              title="搜索函数"
              description="按名称、用途或业务含义快速定位数据库函数。"
              className="mb-4"
            />
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
              const config = getFunctionCategoryConfig(category as FunctionInfo['category']);
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
        <SettingsInfoPanel
          title="💡 关于数据库函数"
          description="这些函数是系统的核心业务逻辑，负责处理数据的增删改查、统计分析和 AI 智能功能。了解这些函数能帮助你更好地理解系统是如何工作的。"
          icon={Info}
          tone="purple"
          className="mt-6"
        />
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
  const categoryConfig = getFunctionCategoryConfig(func.category);

  return (
    <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors bg-gray-50 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{func.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryConfig.badgeClassName}`}>
              {categoryConfig.shortLabel}
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
