/**
 * 统一错误代码定义
 *
 * 错误代码格式：CATEGORY_SPECIFIC_ERROR
 * - CATEGORY: 错误类别（VALIDATION, DATABASE, AI, etc）
 * - SPECIFIC: 具体错误类型
 */

export enum ErrorCode {
  // ==================== 验证错误 (400) ====================
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // ==================== 资源错误 (404) ====================
  NOT_FOUND = 'NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  BUDGET_NOT_FOUND = 'BUDGET_NOT_FOUND',
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',

  // ==================== 权限错误 (401/403) ====================
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // ==================== 业务逻辑错误 (400/409) ====================
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  CONFLICT = 'CONFLICT',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // ==================== 数据库错误 (500) ====================
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',

  // ==================== AI 服务错误 (503) ====================
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_RATE_LIMIT_EXCEEDED = 'AI_RATE_LIMIT_EXCEEDED',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',

  // ==================== 外部服务错误 (502/503) ====================
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // ==================== 内部错误 (500) ====================
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // ==================== 客户端存储错误 ====================
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',

  // ==================== 同步错误 ====================
  SYNC_ERROR = 'SYNC_ERROR',
}

/**
 * 错误代码对应的默认 HTTP 状态码
 */
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  // 验证错误 - 400
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.INVALID_DATE_FORMAT]: 400,
  [ErrorCode.INVALID_AMOUNT]: 400,
  [ErrorCode.INVALID_CATEGORY]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,

  // 资源错误 - 404
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.TRANSACTION_NOT_FOUND]: 404,
  [ErrorCode.BUDGET_NOT_FOUND]: 404,
  [ErrorCode.NOTE_NOT_FOUND]: 404,

  // 权限错误 - 401/403
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.SESSION_EXPIRED]: 401,

  // 业务逻辑错误 - 400/409
  [ErrorCode.INSUFFICIENT_DATA]: 400,
  [ErrorCode.DUPLICATE_ENTRY]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 400,

  // 数据库错误 - 500
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 500,
  [ErrorCode.DATABASE_QUERY_ERROR]: 500,
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 500,

  // AI 服务错误 - 503
  [ErrorCode.AI_SERVICE_ERROR]: 503,
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.AI_RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.AI_TIMEOUT]: 504,
  [ErrorCode.AI_INVALID_RESPONSE]: 502,

  // 外部服务错误 - 502/503
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.GATEWAY_TIMEOUT]: 504,

  // 内部错误 - 500
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.CONFIGURATION_ERROR]: 500,

  // 客户端存储错误 - 507
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 507,

  // 同步错误 - 500
  [ErrorCode.SYNC_ERROR]: 500,
};

/**
 * 错误代码对应的默认用户友好消息（中文）
 */
export const ErrorCodeToMessage: Record<ErrorCode, string> = {
  // 验证错误
  [ErrorCode.VALIDATION_ERROR]: '请求数据验证失败',
  [ErrorCode.INVALID_REQUEST]: '请求参数不正确',
  [ErrorCode.INVALID_DATE_FORMAT]: '日期格式不正确',
  [ErrorCode.INVALID_AMOUNT]: '金额格式不正确',
  [ErrorCode.INVALID_CATEGORY]: '分类不正确',
  [ErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',

  // 资源错误
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.TRANSACTION_NOT_FOUND]: '交易记录不存在',
  [ErrorCode.BUDGET_NOT_FOUND]: '预算不存在',
  [ErrorCode.NOTE_NOT_FOUND]: '备注不存在',

  // 权限错误
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.SESSION_EXPIRED]: '会话已过期，请重新登录',

  // 业务逻辑错误
  [ErrorCode.INSUFFICIENT_DATA]: '数据不足，无法完成操作',
  [ErrorCode.DUPLICATE_ENTRY]: '数据已存在',
  [ErrorCode.CONFLICT]: '操作冲突',
  [ErrorCode.BUSINESS_RULE_VIOLATION]: '违反业务规则',

  // 数据库错误
  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: '数据库连接失败',
  [ErrorCode.DATABASE_QUERY_ERROR]: '数据库查询失败',
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: '数据库约束冲突',

  // AI 服务错误
  [ErrorCode.AI_SERVICE_ERROR]: 'AI 服务错误',
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: 'AI 服务暂时不可用',
  [ErrorCode.AI_RATE_LIMIT_EXCEEDED]: 'AI 服务请求过于频繁',
  [ErrorCode.AI_TIMEOUT]: 'AI 服务响应超时',
  [ErrorCode.AI_INVALID_RESPONSE]: 'AI 服务返回无效响应',

  // 外部服务错误
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ErrorCode.GATEWAY_TIMEOUT]: '网关超时',

  // 内部错误
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.CONFIGURATION_ERROR]: '配置错误',

  // 客户端存储错误
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: '存储空间不足',

  // 同步错误
  [ErrorCode.SYNC_ERROR]: '数据同步失败',
};
