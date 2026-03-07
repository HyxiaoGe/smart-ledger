'use client';

import { Settings2, Pause, Calendar, Clock } from 'lucide-react';
import { SettingsCalloutCard } from '@/components/shared/SettingsCalloutCard';

export function FeatureDescription() {
  return (
    <SettingsCalloutCard title="功能说明" icon={Settings2} tone="blue" className="mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 bg-green-50 dark:bg-green-950 rounded-full"></div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">自动生成</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">在指定时间自动创建交易记录</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Pause className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">灵活控制</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">随时暂停或启用固定支出</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">智能防重</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">避免重复生成同一天记录</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">多种频率</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">支持每日、每周、每月等设置</p>
          </div>
        </div>
      </div>
    </SettingsCalloutCard>
  );
}
