"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Activity,
  Clock,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// 日志类型定义
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogCategory = 'api_request' | 'user_action' | 'system' | 'error' | 'performance' | 'security' | 'data_sync';

interface LogRecord {
  id: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  trace_id?: string;
  method?: string;
  path?: string;
  status_code?: number;
  duration_ms?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

interface LogStats {
  overview: {
    total_logs: number;
    error_logs: number;
    recent_24h: number;
    recent_1h: number;
  };
  level_stats: Array<{ level: string; count: number }>;
  category_stats: Array<{ category: string; count: number }>;
  api_stats: {
    total_requests: number;
    success_requests: number;
    client_errors: number;
    server_errors: number;
    success_rate: number;
    avg_response_time: number;
  };
  recent_errors: LogRecord[];
}

export default function LogsPage() {
  // 状态管理
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 过滤状态
  const [filters, setFilters] = useState({
    level: '' as LogLevel | '',
    category: '' as LogCategory | '',
    search: '',
  });

  // 选中的日志详情
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);

  // 加载日志列表
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filters.level) params.append('level', filters.level);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination.total_pages);
        setTotal(data.pagination.total);
      } else {
        setError('加载日志失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/logs/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filters]);

  // 刷新
  const handleRefresh = () => {
    fetchLogs();
    fetchStats();
  };

  // 应用过滤
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // 重置到第一页
  };

  // 获取日志级别的图标和颜色
  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return <Info className="w-4 h-4 text-gray-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'fatal':
        return <XCircle className="w-4 h-4 text-red-700" />;
    }
  };

  const getLevelBadgeClass = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'bg-gray-100 text-gray-700';
      case 'info':
        return 'bg-blue-100 text-blue-700';
      case 'warn':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'fatal':
        return 'bg-red-200 text-red-900';
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/advanced">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回高级配置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">系统日志</h2>
            <p className="text-gray-600 dark:text-gray-300">查看和分析系统运行日志</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总日志数</CardDescription>
              <CardTitle className="text-2xl">{stats.overview.total_logs.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                24小时内: {stats.overview.recent_24h}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>错误日志</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.overview.error_logs}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                1小时内: {stats.overview.recent_1h}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>API 成功率</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.api_stats.success_rate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                {stats.api_stats.success_requests}/{stats.api_stats.total_requests} 请求
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>平均响应时间</CardDescription>
              <CardTitle className="text-2xl">{stats.api_stats.avg_response_time}ms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500">
                基于最近 24小时
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            过滤器
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="level-filter">日志级别</Label>
              <select
                id="level-filter"
                className="w-full mt-1 p-2 border rounded-md"
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
              >
                <option value="">全部</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
                <option value="fatal">Fatal</option>
              </select>
            </div>

            <div>
              <Label htmlFor="category-filter">日志类别</Label>
              <select
                id="category-filter"
                className="w-full mt-1 p-2 border rounded-md"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">全部</option>
                <option value="api_request">API 请求</option>
                <option value="user_action">用户操作</option>
                <option value="system">系统</option>
                <option value="error">错误</option>
                <option value="performance">性能</option>
                <option value="security">安全</option>
                <option value="data_sync">数据同步</option>
              </select>
            </div>

            <div>
              <Label htmlFor="search-filter">搜索</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search-filter"
                  type="text"
                  placeholder="搜索消息或路径..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>日志记录</CardTitle>
          <CardDescription>
            共 {total} 条记录，第 {page}/{totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>暂无日志记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getLevelIcon(log.level)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelBadgeClass(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                          {log.category}
                        </span>
                        {log.trace_id && (
                          <span className="text-xs text-gray-400 font-mono">
                            {log.trace_id.substring(0, 20)}...
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mb-1">{log.message}</div>
                      {log.path && (
                        <div className="text-xs text-gray-500">
                          {log.method} {log.path}
                          {log.status_code && ` - ${log.status_code}`}
                          {log.duration_ms && ` (${log.duration_ms}ms)`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-500">
                显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日志详情弹窗 */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">日志详情</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">级别：</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ml-2 ${getLevelBadgeClass(selectedLog.level)}`}>
                  {selectedLog.level.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="font-semibold">类别：</span>
                <span className="ml-2">{selectedLog.category}</span>
              </div>
              <div>
                <span className="font-semibold">消息：</span>
                <div className="mt-1 p-3 bg-gray-50 rounded">{selectedLog.message}</div>
              </div>
              {selectedLog.trace_id && (
                <div>
                  <span className="font-semibold">追踪 ID：</span>
                  <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">{selectedLog.trace_id}</code>
                </div>
              )}
              {selectedLog.path && (
                <div>
                  <span className="font-semibold">路径：</span>
                  <span className="ml-2">{selectedLog.method} {selectedLog.path}</span>
                </div>
              )}
              {selectedLog.status_code && (
                <div>
                  <span className="font-semibold">状态码：</span>
                  <span className="ml-2">{selectedLog.status_code}</span>
                </div>
              )}
              {selectedLog.duration_ms && (
                <div>
                  <span className="font-semibold">耗时：</span>
                  <span className="ml-2">{selectedLog.duration_ms}ms</span>
                </div>
              )}
              <div>
                <span className="font-semibold">创建时间：</span>
                <span className="ml-2">{formatTime(selectedLog.created_at)}</span>
              </div>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="font-semibold">元数据：</span>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
