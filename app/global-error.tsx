'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台（生产环境可以发送到错误监控服务）
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            padding: '2rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                margin: '0 auto 1rem',
                width: '3rem',
                height: '3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '9999px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '1.5rem'
              }}>
                ⚠️
              </div>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                应用程序出现错误
              </h2>
            </div>

            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              很抱歉，应用程序遇到了一个严重错误。请尝试刷新页面。
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginBottom: '1.5rem' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  错误详情（仅开发环境可见）
                </summary>
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem'
                }}>
                  <p style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#dc2626',
                    wordBreak: 'break-all',
                    margin: 0
                  }}>
                    {error.message}
                  </p>
                  {error.digest && (
                    <p style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      margin: '0.5rem 0 0 0'
                    }}>
                      错误 ID: {error.digest}
                    </p>
                  )}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🔄 重试
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🏠 返回首页
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
