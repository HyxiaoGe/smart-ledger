# 统一错误处理系统

统一的错误处理系统，提供标准化的错误代码、错误类和响应格式。

## 📚 核心概念

### 1. 错误代码 (ErrorCode)

标准化的错误代码枚举，用于精确识别错误类型：

```typescript
import { ErrorCode } from '@/lib/domain/errors';

// 验证错误
ErrorCode.VALIDATION_ERROR
ErrorCode.INVALID_AMOUNT

// 资源错误
ErrorCode.NOT_FOUND
ErrorCode.TRANSACTION_NOT_FOUND

// AI 服务错误
ErrorCode.AI_SERVICE_UNAVAILABLE
ErrorCode.AI_TIMEOUT
```

### 2. 错误类 (AppError)

自定义错误类，提供丰富的错误信息：

```typescript
import { AppError, ValidationError, NotFoundError } from '@/lib/domain/errors';

// 基础用法
throw new AppError(
  ErrorCode.VALIDATION_ERROR,
  '金额必须大于 0',
  [{ field: 'amount', message: '金额必须大于 0' }]
);

// 使用便捷类
throw new ValidationError('请求数据不正确', [
  { field: 'date', message: '日期格式不正确' }
]);

throw new NotFoundError('交易记录', transactionId);
```

### 3. 错误处理中间件 (withErrorHandler)

自动捕获和处理 API 路由中的错误：

```typescript
import { withErrorHandler } from '@/lib/domain/errors';

export const POST = withErrorHandler(async (req) => {
  // 业务逻辑
  // 任何抛出的错误都会被自动处理
});
```

## 🚀 使用指南

### API 路由中使用

**基础用法：**

```typescript
import { NextRequest } from 'next/server';
import { withErrorHandler, ValidationError, successResponse } from '@/lib/domain/errors';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();

  // 验证数据
  if (!body.amount || body.amount <= 0) {
    throw new ValidationError('金额不正确', [
      { field: 'amount', message: '金额必须大于 0', value: body.amount }
    ]);
  }

  // 业务逻辑
  const result = await createTransaction(body);

  // 返回成功响应
  return successResponse(result, 201);
});
```

**使用 Zod 验证：**

```typescript
import { z } from 'zod';
import { withErrorHandler, successResponse } from '@/lib/domain/errors';

const TransactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();

  // Zod 验证错误会自动转换为 ValidationError
  const data = TransactionSchema.parse(body);

  const result = await createTransaction(data);

  return successResponse(result, 201);
});
```

**处理资源未找到：**

```typescript
import { withErrorHandler, NotFoundError, successResponse } from '@/lib/domain/errors';

export const GET = withErrorHandler(async (req: NextRequest, { params }) => {
  const { id } = params;

  const transaction = await getTransaction(id);

  if (!transaction) {
    throw new NotFoundError('交易记录', id);
  }

  return successResponse(transaction);
});
```

**处理 AI 服务错误：**

```typescript
import { withErrorHandler, AIServiceError, ErrorCode, successResponse } from '@/lib/domain/errors';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();

  try {
    const result = await callAIService(body);
    return successResponse(result);
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      throw new AIServiceError(
        ErrorCode.AI_TIMEOUT,
        'AI 服务响应超时，请稍后重试'
      );
    }
    throw error; // 其他错误继续抛出
  }
});
```

### 在服务层使用

**Repository 层：**

```typescript
import { DatabaseError, NotFoundError } from '@/lib/domain/errors';

export class TransactionRepository {
  async findById(id: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new DatabaseError(`查询交易失败: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundError('交易记录', id);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new DatabaseError('数据库操作失败');
    }
  }
}
```

**Service 层：**

```typescript
import { BusinessRuleError, InsufficientDataError } from '@/lib/domain/errors';

export class BudgetService {
  async createBudget(data: CreateBudgetDTO) {
    // 业务规则验证
    if (data.amount <= 0) {
      throw new BusinessRuleError('预算金额必须大于 0');
    }

    // 检查数据完整性
    const transactions = await this.getTransactions(data.month);
    if (transactions.length < 5) {
      throw new InsufficientDataError(
        '交易记录不足，无法创建预算',
        [{ field: 'transactions', message: '至少需要 5 条交易记录' }]
      );
    }

    // 创建预算
    return await this.repository.create(data);
  }
}
```

### 异步操作错误处理

**后台任务（不应影响主流程）：**

```typescript
import { safeAsync } from '@/lib/domain/errors';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();

  // 主要逻辑
  const transaction = await createTransaction(body);

  // 后台任务 - 失败不影响主流程
  await safeAsync(
    () => updateAnalytics(transaction),
    '更新分析数据失败'
  );

  await safeAsync(
    () => triggerNotification(transaction),
    '发送通知失败',
    (error) => {
      // 可选的错误回调
      console.error('通知发送失败，记录到错误队列');
    }
  );

  return successResponse(transaction, 201);
});
```

**同步操作错误处理：**

```typescript
import { safeSync } from '@/lib/domain/errors';

// JSON 解析容错
const data = safeSync(
  () => JSON.parse(rawData),
  {},
  'JSON 解析失败，使用默认值'
);

// 配置读取容错
const config = safeSync(
  () => loadConfig(),
  defaultConfig,
  '加载配置失败，使用默认配置'
);
```

## 📝 错误响应格式

### 标准错误响应

```json
{
  "error": "VALIDATION_ERROR",
  "message": "请求数据验证失败",
  "statusCode": 400,
  "details": [
    {
      "field": "amount",
      "message": "金额必须大于 0",
      "value": -100
    }
  ],
  "traceId": "trace_1234567890_abc123"
}
```

### 开发环境错误响应（包含堆栈）

```json
{
  "error": "INTERNAL_ERROR",
  "message": "数据库连接失败",
  "statusCode": 500,
  "traceId": "trace_1234567890_abc123",
  "stack": "Error: Connection refused\n    at ...",
  "metadata": {
    "timestamp": "2025-11-16T07:30:00.000Z",
    "originalError": "ConnectionError"
  }
}
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "id": "123",
    "amount": 100,
    "category": "food"
  }
}
```

## 🎯 最佳实践

### 1. 使用正确的错误类

```typescript
// ✅ 好的做法
throw new ValidationError('数据验证失败', details);
throw new NotFoundError('用户', userId);
throw new BusinessRuleError('余额不足');

// ❌ 不好的做法
throw new Error('数据验证失败');
throw new AppError(ErrorCode.INTERNAL_ERROR, '用户不存在'); // 应该用 NotFoundError
```

### 2. 提供详细的错误信息

```typescript
// ✅ 好的做法
throw new ValidationError('请求数据验证失败', [
  { field: 'amount', message: '金额必须大于 0', value: -100 },
  { field: 'date', message: '日期格式不正确', value: '2025/11/16' }
]);

// ❌ 不好的做法
throw new ValidationError('数据不正确');
```

### 3. 使用 safeAsync 处理非关键异步操作

```typescript
// ✅ 好的做法 - 后台任务失败不影响主流程
await safeAsync(() => sendEmail(user), '发送邮件失败');

// ❌ 不好的做法 - 邮件发送失败导致整个请求失败
await sendEmail(user);
```

### 4. 在适当的层级处理错误

```typescript
// ✅ 好的做法 - Repository 层抛出 DatabaseError
class Repository {
  async save(data) {
    try {
      return await db.insert(data);
    } catch (error) {
      throw new DatabaseError('保存失败');
    }
  }
}

// Service 层抛出 BusinessRuleError
class Service {
  async create(data) {
    if (!this.validate(data)) {
      throw new BusinessRuleError('数据不符合业务规则');
    }
    return await this.repository.save(data);
  }
}

// API 层使用 withErrorHandler 统一处理
export const POST = withErrorHandler(async (req) => {
  const result = await service.create(await req.json());
  return successResponse(result);
});
```

## 🔍 错误追踪

每个错误都会自动生成一个 `traceId`，用于追踪和调试：

```typescript
// 客户端错误响应示例
{
  "error": "DATABASE_ERROR",
  "message": "查询失败",
  "traceId": "trace_1700000000_abc123"
}
```

使用 traceId 可以在日志中快速定位问题：

```bash
# 搜索日志
grep "trace_1700000000_abc123" logs/app.log
```

## 📊 错误状态码映射

| 错误代码 | HTTP 状态码 | 说明 |
|---------|-----------|------|
| VALIDATION_ERROR | 400 | 验证失败 |
| NOT_FOUND | 404 | 资源不存在 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 无权限 |
| CONFLICT | 409 | 冲突 |
| AI_SERVICE_UNAVAILABLE | 503 | AI 服务不可用 |
| AI_RATE_LIMIT_EXCEEDED | 429 | 请求过于频繁 |
| AI_TIMEOUT | 504 | 超时 |
| DATABASE_ERROR | 500 | 数据库错误 |
| INTERNAL_ERROR | 500 | 内部错误 |

## 🔧 迁移指南

### 从旧的错误处理迁移

**旧代码：**

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await someOperation(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    );
  }
}
```

**新代码：**

```typescript
import { withErrorHandler, successResponse } from '@/lib/domain/errors';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const result = await someOperation(body);
  return successResponse(result);
});
```

## 📦 导出清单

```typescript
// 错误代码
export { ErrorCode, ErrorCodeToHttpStatus, ErrorCodeToMessage } from './ErrorCode';

// 错误类
export {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AIServiceError,
  UnauthorizedError,
  InsufficientDataError,
  BusinessRuleError,
  InternalError,
  isAppError,
  isOperationalError,
} from './AppError';

// 错误处理工具
export {
  withErrorHandler,
  successResponse,
  errorResponse,
  safeAsync,
  safeSync,
  generateTraceId,
  normalizeError,
  errorToResponse,
} from './errorHandler';
```
