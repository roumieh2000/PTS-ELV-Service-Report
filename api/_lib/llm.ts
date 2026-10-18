export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface Provider {
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

function providers(): Provider[] {
  const list: Provider[] = []
  if (process.env.GEMINI_API_KEY) {
    list.push({
      name: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    })
  }
  if (process.env.GROQ_API_KEY) {
    list.push({
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    })
  }
  return list
}

export function llmConfigured(): boolean {
  return providers().length > 0
}

async function callProvider(
  p: Provider,
  messages: ChatMsg[],
  tools: ToolDef[],
): Promise<ChatMsg> {
  const res = await fetch(`${p.baseUrl}chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify({
      model: p.model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`${p.name} ${res.status}: ${text.slice(0, 300)}`) as Error & { retryable: boolean }
    err.retryable = res.status === 429 || res.status >= 500
    throw err
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: ChatMsg }>
  }
  const msg = data.choices?.[0]?.message
  if (!msg) throw new Error(`${p.name}: empty response`)
  return { role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls }
}

export async function chatComplete(
  messages: ChatMsg[],
  tools: ToolDef[],
): Promise<ChatMsg> {
  const list = providers()
  if (list.length === 0) {
    throw new Error('No LLM provider configured. Set GEMINI_API_KEY (free at aistudio.google.com) or GROQ_API_KEY.')
  }
  let lastError: Error | null = null
  for (const p of list) {
    try {
      return await callProvider(p, messages, tools)
    } catch (e) {
      lastError = e as Error
      const retryable = (e as Error & { retryable?: boolean }).retryable
      if (!retryable) throw lastError
    }
  }
  throw lastError ?? new Error('All LLM providers failed')
}
