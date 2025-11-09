// AI 客户端（默认 DeepSeek，可通过环境变量切换到 OpenAI 兼容接口）
// 为降低依赖，此处用 fetch 直连，接口需符合 OpenAI Chat Completions 兼容协议。

import { createModuleLogger, startPerformanceMeasure } from '@/lib/core/logger';

const aiLogger = createModuleLogger('ai-client');

export type Provider = 'deepseek' | 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const provider: Provider = (process.env.AI_PROVIDER as Provider) || 'deepseek';

// DeepSeek 兼容配置（可在 .env.local 配置）
const DEFAULTS = {
  deepseek: {
    baseUrl: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY
  },
  openai: {
    baseUrl: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY
  }
} as const;

export async function chat(messages: ChatMessage[]): Promise<string> {
  const conf = DEFAULTS[provider];
  const measure = startPerformanceMeasure();

  if (!conf.apiKey) {
    aiLogger.warn({ provider }, 'AI API Key 未配置，返回占位内容');
    // 无 API Key 时返回占位文本，避免阻塞本地开发
    return '（开发提示）未配置 AI API Key，返回占位分析结果。';
  }

  aiLogger.info({
    provider,
    model: conf.model,
    messageCount: messages.length,
    systemPromptLength: messages.find(m => m.role === 'system')?.content.length || 0,
    userPromptLength: messages.find(m => m.role === 'user')?.content.length || 0
  }, 'AI 请求开始');

  try {
    const resp = await fetch(`${conf.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conf.apiKey}`
      },
      body: JSON.stringify({
        model: conf.model,
        messages,
        temperature: 0.3
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      aiLogger.error({
        ...measure(),
        provider,
        model: conf.model,
        status: resp.status,
        statusText: resp.statusText,
        responseText: text.slice(0, 500) // 限制长度，避免日志过大
      }, 'AI 请求失败');

      throw new Error(`AI 请求失败：${resp.status} ${text}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const usage = data?.usage;

    aiLogger.info({
      ...measure(),
      provider,
      model: conf.model,
      responseLength: content.length,
      tokens: usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined
    }, 'AI 请求成功');

    return content.trim();
  } catch (error) {
    aiLogger.error({
      ...measure(),
      provider,
      model: conf.model,
      error: error instanceof Error ? error.message : String(error)
    }, 'AI 请求异常');

    throw error;
  }
}

// 暴露当前提供商配置，供流式路由使用
export function getAiConfig() {
  return { provider, conf: DEFAULTS[provider] };
}
