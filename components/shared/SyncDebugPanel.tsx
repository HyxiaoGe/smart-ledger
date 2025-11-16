/**
 * 同步调试面板
 * 用于开发和调试数据同步功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Clock,
  Database,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { syncStateManager, SyncState } from '@/lib/core/SyncStateManager';
import { getStorageUsage, cleanupExpiredData } from '@/lib/utils/storage';
import { useSyncState } from '@/hooks/useSyncState';

const statusColorMap = {
  idle: 'bg-gray-500',
  syncing: 'bg-blue-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  conflict: 'bg-yellow-500',
};

const statusLabelMap = {
  idle: '空闲',
  syncing: '同步中',
  success: '成功',
  error: '错误',
  conflict: '冲突',
};

export function SyncDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [history, setHistory] = useState<SyncState[]>([]);
  const [storageInfo, setStorageInfo] = useState<ReturnType<typeof getStorageUsage>>(null);

  const currentState = useSyncState();

  // 加载历史记录
  const loadHistory = () => {
    const h = syncStateManager.getHistory(20);
    setHistory(h);
  };

  // 更新存储信息
  const updateStorageInfo = () => {
    const info = getStorageUsage();
    setStorageInfo(info);
  };

  // 清理过期数据
  const handleCleanup = () => {
    const cleaned = cleanupExpiredData('smart-ledger-', 24 * 60 * 60 * 1000); // 24小时
    alert(`已清理 ${cleaned} 条过期数据`);
    updateStorageInfo();
  };

  // 重置状态
  const handleReset = () => {
    syncStateManager.reset();
    syncStateManager.clearHistory();
    loadHistory();
  };

  useEffect(() => {
    if (isVisible) {
      loadHistory();
      updateStorageInfo();

      // 定时更新
      const interval = setInterval(() => {
        loadHistory();
        updateStorageInfo();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-purple-600 dark:bg-purple-700 text-white rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
        title="打开同步调试面板"
      >
        <Activity className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[400px] max-h-[600px] overflow-hidden shadow-2xl rounded-lg border border-gray-200 dark:border-gray-800">
      <Card className="h-full">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            同步调试面板
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* 当前状态 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">当前状态</span>
              <Badge className={`${statusColorMap[currentState.status]} text-white`}>
                {statusLabelMap[currentState.status]}
              </Badge>
            </div>

            {currentState.message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {currentState.message}
              </p>
            )}

            {currentState.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>进度</span>
                  <span>{currentState.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${currentState.progress}%` }}
                  />
                </div>
              </div>
            )}

            {currentState.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {currentState.error.message}
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              <Clock className="h-3 w-3 inline mr-1" />
              {new Date(currentState.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* 存储使用情况 */}
          {storageInfo && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">存储使用</span>
                <span className="text-xs text-gray-500">
                  {(storageInfo.used / 1024).toFixed(1)} KB / {(storageInfo.available / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    storageInfo.percentage > 80
                      ? 'bg-red-500'
                      : storageInfo.percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${storageInfo.percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {storageInfo.percentage.toFixed(1)}% 已使用
              </div>
            </div>
          )}

          {/* 历史记录 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">同步历史</span>
              <span className="text-xs text-gray-500">{history.length} 条记录</span>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">暂无同步记录</p>
              ) : (
                history.slice().reverse().map((state, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        className={`${statusColorMap[state.status]} text-white text-[10px] px-1.5 py-0`}
                      >
                        {statusLabelMap[state.status]}
                      </Badge>
                      <span className="text-gray-500">
                        {new Date(state.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {state.message && (
                      <p className="text-gray-600 dark:text-gray-400">{state.message}</p>
                    )}
                    {state.operationId && (
                      <p className="text-gray-500 font-mono text-[10px] mt-1">
                        ID: {state.operationId.slice(-8)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={loadHistory}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              刷新
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleCleanup}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清理
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleReset}
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
