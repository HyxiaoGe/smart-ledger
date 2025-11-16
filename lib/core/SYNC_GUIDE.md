# 数据同步系统使用指南

## 概述

Smart Ledger 的数据同步系统经过增强，提供了以下功能：

- ✅ **状态管理**：实时追踪同步状态
- ✅ **用户反馈**：Toast 通知显示同步结果
- ✅ **错误处理**：完善的错误捕获和报告
- ✅ **自动重试**：失败后自动重试（最多3次）
- ✅ **冲突检测**：多标签页并发修改检测
- ✅ **边界处理**：Storage quota 检测和过期数据清理
- ✅ **调试工具**：可视化调试面板

## 快速开始

### 1. 添加通知提供者

在根布局中添加 `SyncNotificationProvider`：

\`\`\`tsx
// app/layout.tsx
import { SyncNotificationProvider } from '@/components/shared/SyncNotificationProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SyncNotificationProvider />
      </body>
    </html>
  );
}
\`\`\`

### 2. 监听同步事件

使用 `useEnhancedDataSync` Hook：

\`\`\`tsx
import { useEnhancedDataSync } from '@/hooks/useEnhancedDataSync';
import { useCallback } from 'react';

function MyComponent() {
  const handleTransactionAdded = useCallback((event) => {
    console.log('Transaction added:', event);
    // 刷新数据...
  }, []);

  useEnhancedDataSync('transaction_added', handleTransactionAdded);

  // ...
}
\`\`\`

### 3. 发送同步事件

使用 `enhancedDataSync` 实例：

\`\`\`tsx
import { enhancedDataSync } from '@/lib/core/EnhancedDataSync';

// 添加交易后
const operationId = enhancedDataSync.notifyTransactionAdded({
  id: '123',
  amount: 100,
});

// 更新交易后
enhancedDataSync.notifyTransactionUpdated({ id: '123' });

// 删除交易后
enhancedDataSync.notifyTransactionDeleted({ id: '123' });
\`\`\`

## 高级用法

### 查看同步状态

使用 `useSyncState` Hook：

\`\`\`tsx
import { useSyncState } from '@/hooks/useSyncState';

function SyncStatus() {
  const syncState = useSyncState();

  return (
    <div>
      <p>状态: {syncState.status}</p>
      <p>消息: {syncState.message}</p>
      {syncState.progress && <p>进度: {syncState.progress}%</p>}
    </div>
  );
}
\`\`\`

### 手动控制同步状态

使用 `useSyncControls` Hook：

\`\`\`tsx
import { useSyncControls } from '@/hooks/useSyncState';

function MyComponent() {
  const { startSync, syncSuccess, syncError } = useSyncControls();

  const handleSync = async () => {
    const operationId = 'my-operation-123';

    try {
      startSync(operationId, '正在同步数据...');

      // 执行同步操作...
      await someAsyncOperation();

      syncSuccess(operationId, '同步完成！');
    } catch (error) {
      syncError(operationId, error, () => handleSync()); // 提供重试
    }
  };

  return <button onClick={handleSync}>同步</button>;
}
\`\`\`

### 启用调试面板

在开发环境中添加调试面板：

\`\`\`tsx
// app/layout.tsx
import { SyncDebugPanel } from '@/components/shared/SyncDebugPanel';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <SyncDebugPanel />}
      </body>
    </html>
  );
}
\`\`\`

## 配置选项

可以自定义同步管理器的配置：

\`\`\`tsx
import { EnhancedDataSyncManager } from '@/lib/core/EnhancedDataSync';

const customSync = EnhancedDataSyncManager.getInstance({
  debounceTime: 500,        // 防抖时间（ms）
  cleanupDelay: 300,        // 清理延迟（ms）
  maxRetries: 5,            // 最大重试次数
  retryDelay: 2000,         // 重试延迟（ms）
  enableConflictDetection: true,  // 启用冲突检测
});
\`\`\`

## 错误处理

所有错误都会自动集成到阶段一的统一错误处理系统：

\`\`\`tsx
import { AppError, ErrorCode } from '@/lib/domain/errors';

// 错误会自动被捕获和报告
// 用户会看到 Toast 通知
// 开发者会在调试面板中看到详细信息
\`\`\`

## 最佳实践

1. **总是使用 useCallback**：避免不必要的重新订阅
   \`\`\`tsx
   const handleEvent = useCallback((event) => {
     // ...
   }, [dependencies]);

   useEnhancedDataSync('transaction_added', handleEvent);
   \`\`\`

2. **合理设置通知时长**：
   - 成功通知：2-3秒
   - 错误通知：5-8秒
   - 冲突通知：8-10秒（需要用户操作）

3. **使用调试面板**：在开发时启用调试面板，监控同步状态和存储使用

4. **定期清理过期数据**：使用 `cleanupExpiredData` 函数

5. **处理网络异常**：自动重试机制会处理临时网络问题

## 故障排查

### 同步不工作

1. 检查 `SyncNotificationProvider` 是否已添加
2. 检查 localStorage 是否被禁用
3. 查看调试面板中的错误信息
4. 检查浏览器控制台的错误日志

### Storage Quota 错误

1. 使用调试面板查看存储使用情况
2. 调用 `cleanupExpiredData` 清理过期数据
3. 减少存储的数据量

### 冲突频繁发生

1. 检查是否有多个标签页同时修改数据
2. 考虑增加 `debounceTime` 配置
3. 使用版本号来解决冲突

## API 参考

### Hooks

- `useEnhancedDataSync(eventType, callback)` - 订阅同步事件
- `useAllDataSyncEvents(callback)` - 订阅所有同步事件
- `useSyncState()` - 获取当前同步状态
- `useSyncNotifications(onNotification?)` - 订阅通知
- `useSyncControls()` - 获取同步控制函数

### 实例方法

#### enhancedDataSync

- `notifyTransactionAdded(data?, confirmed?)` - 通知交易已添加
- `notifyTransactionUpdated(data?, confirmed?)` - 通知交易已更新
- `notifyTransactionDeleted(data?, confirmed?)` - 通知交易已删除
- `onEvent(eventType, callback)` - 订阅事件
- `getDataVersion()` - 获取当前数据版本

#### syncStateManager

- `updateState(state, operationId?)` - 更新状态
- `notify(notification)` - 发送通知
- `startSync(operationId, message?)` - 开始同步
- `syncSuccess(operationId, message?, showNotification?)` - 同步成功
- `syncError(operationId, error, retryAction?)` - 同步失败
- `syncConflict(operationId, message, resolveAction?)` - 检测到冲突
- `getCurrentState()` - 获取当前状态
- `getHistory(limit?)` - 获取历史记录

### 工具函数

- `hasStorageQuota()` - 检查存储空间
- `getStorageUsage()` - 获取存储使用情况
- `cleanupExpiredData(prefix, maxAge)` - 清理过期数据

## 迁移指南

### 从旧版 dataSync 迁移

替换导入：

\`\`\`tsx
// 旧版
import { useDataSync } from '@/lib/core/dataSync';

// 新版
import { useEnhancedDataSync } from '@/hooks/useEnhancedDataSync';
\`\`\`

Hook 参数保持不变，完全兼容。

### 添加状态反馈

在现有组件中添加状态显示：

\`\`\`tsx
import { useSyncState } from '@/hooks/useSyncState';

function MyComponent() {
  const syncState = useSyncState();

  return (
    <div>
      {syncState.status === 'syncing' && <Spinner />}
      {/* 现有代码 */}
    </div>
  );
}
\`\`\`
