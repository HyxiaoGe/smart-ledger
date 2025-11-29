/**
 * 统一的 API 客户端
 * 基于 fetch 的请求封装，提供统一的错误处理、超时控制等
 */

const DEFAULT_TIMEOUT = 10000;

/**
 * API 错误类
 */
export class ApiError extends Error {
  status: number;
  data: unknown;
  code?: string;

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code;
  }

  /**
   * 是否为网络错误
   */
  isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * 是否为超时错误
   */
  isTimeoutError(): boolean {
    return this.status === 408;
  }

  /**
   * 是否为客户端错误 (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * 是否为服务端错误 (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * 请求配置
 */
interface RequestConfig extends Omit<RequestInit, 'body'> {
  timeout?: number;
  body?: unknown;
}

/**
 * API 响应格式
 */
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}

/**
 * 发送 API 请求
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, body, headers, ...init } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: init.signal ?? controller.signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload: ApiResponse<T> | undefined = isJson
      ? await response.json().catch(() => undefined)
      : undefined;

    if (!response.ok) {
      throw new ApiError(
        payload?.message || payload?.error || response.statusText || '请求失败',
        response.status,
        payload,
        (payload as { code?: string })?.code
      );
    }

    // 返回 data 字段或整个 payload
    return (payload?.data ?? payload) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('请求超时', 408);
      }
      throw new ApiError(error.message || '网络错误', 0);
    }

    throw new ApiError('未知错误', 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API 客户端
 */
export const apiClient = {
  /**
   * GET 请求
   */
  get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' });
  },

  /**
   * POST 请求
   */
  post<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'POST', body: data });
  },

  /**
   * PUT 请求
   */
  put<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'PUT', body: data });
  },

  /**
   * PATCH 请求
   */
  patch<T>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'PATCH', body: data });
  },

  /**
   * DELETE 请求
   */
  delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method'> & { data?: unknown }): Promise<T> {
    const { data, ...rest } = config || {};
    return request<T>(endpoint, { ...rest, method: 'DELETE', body: data });
  },
};

/**
 * 构建查询字符串
 * @param params 查询参数对象，值会被转换为字符串
 */
export function buildQueryString(params: object): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
