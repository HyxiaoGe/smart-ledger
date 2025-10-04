// AI 客户端（默认 DeepSeek，可通过环境变量切换到 OpenAI 兼容接口）
// 为降低依赖，此处用 fetch 直连，接口需符合 OpenAI Chat Completions 兼容协议。

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
  if (!conf.apiKey) {
    // 无 API Key 时返回占位文本，避免阻塞本地开发
    return '（开发提示）未配置 AI API Key，返回占位分析结果。';
  }

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
    throw new Error(`AI 请求失败：${resp.status} ${text}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return content.trim();
}

// 暴露当前提供商配置，供流式路由使用
export function getAiConfig() {
  return { provider, conf: DEFAULTS[provider] };
}

