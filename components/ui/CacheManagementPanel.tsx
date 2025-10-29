/**
 * 缓存管理面板
 * 用于调试和监控AI缓存状态
 */

import { useState } from 'react';
import { useCacheManagement } from '@/hooks/useAICache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Database,
  Trash2,
  RefreshCw,
  Download,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface CacheManagementPanelProps {
  show?: boolean;
  onClose?: () => void;
}

export function CacheManagementPanel({ show = false, onClose }: CacheManagementPanelProps) {
  const {
    showDebugInfo,
    setShowDebugInfo,
    cacheStats,
    healthStatus,
    getCacheSizeDisplay,
    getHitRateDisplay,
    clearAllCache,
    exportCache,
    warmupCache,
  } = useCacheManagement();

  const [isClearing, setIsClearing] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  if (!show) return null;

  const handleClearCache = async () => {
    if (confirm('确定要清空所有AI缓存吗？这将删除所有本地缓存数据。')) {
      setIsClearing(true);
      try {
        await clearAllCache();
        alert('缓存已清空');
      } catch (error) {
        alert('清空缓存失败: ' + error);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleWarmupCache = async () => {
    setIsWarmingUp(true);
    try {
      await warmupCache();
      alert('缓存预热完成');
    } catch (error) {
      alert('缓存预热失败: ' + error);
    } finally {
      setIsWarmingUp(false);
    }
  };

  const handleExportCache = () => {
    const cacheData = exportCache();
    const blob = new Blob([JSON.stringify(cacheData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-cache-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getHealthStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <CardTitle>AI缓存管理</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 缓存健康状态 */}
          <Alert className={getHealthStatusColor()}>
            <div className="flex items-center space-x-2">
              {getHealthStatusIcon()}
              <AlertDescription>
                <strong>缓存状态:</strong> {healthStatus.status === 'healthy' ? '健康' :
                healthStatus.status === 'warning' ? '警告' : '错误'}
                {healthStatus.issues.length > 0 && (
                  <ul className="mt-2 text-sm">
                    {healthStatus.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </div>
          </Alert>

          {/* 缓存统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{cacheStats.totalRequests}</div>
                <div className="text-sm text-gray-600">总请求</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{getHitRateDisplay()}</div>
                <div className="text-sm text-gray-600">命中率</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{getCacheSizeDisplay()}</div>
                <div className="text-sm text-gray-600">缓存大小</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">
                  {Math.round((Date.now() - cacheStats.lastCleanup) / 1000 / 60)}m
                </div>
                <div className="text-sm text-gray-600">上次清理</div>
              </CardContent>
            </Card>
          </div>

          {/* 缓存配置信息 */}
          {showDebugInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">缓存配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(cacheStats.configs).map(([type, config]) => (
                    <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{type}</span>
                      <div className="flex space-x-4 text-sm text-gray-600">
                        <span>TTL: {Math.round(config.ttl / 1000 / 60)}m</span>
                        <span>Max: {config.maxSize}</span>
                        <Badge variant="outline">{config.version}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 推荐建议 */}
          {healthStatus.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">优化建议</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {healthStatus.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              {showDebugInfo ? '隐藏' : '显示'}调试信息
            </Button>

            <Button
              variant="outline"
              onClick={handleWarmupCache}
              disabled={isWarmingUp}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isWarmingUp ? '预热中...' : '预热缓存'}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCache}
            >
              <Download className="h-4 w-4 mr-2" />
              导出缓存
            </Button>

            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? '清空中...' : '清空缓存'}
            </Button>
          </div>

          {/* 说明信息 */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 space-y-1">
                <p>• <strong>L1缓存:</strong> 本地存储，毫秒级响应，离线可用</p>
                <p>• <strong>L2缓存:</strong> 数据库存储，跨设备同步，持久保存</p>
                <p>• <strong>智能缓存:</strong> 自动失效，分层降级，性能优化</p>
                <p>• <strong>预热策略:</strong> 预加载常用数据，提升用户体验</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

// 便捷的缓存触发器组件
export function CacheTriggerButton() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 z-40 opacity-50 hover:opacity-100"
      >
        <Database className="h-4 w-4" />
      </Button>

      <CacheManagementPanel
        show={showPanel}
        onClose={() => setShowPanel(false)}
      />
    </>
  );
}