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
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
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
  const started = Date.now()
  const body: Record<string, unknown> = {
    model: p.model,
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.3,
  }
  if (p.name === 'gemini') {
    const effort = process.env.LLM_REASONING_EFFORT ?? 'low'
    if (effort && effort !== 'off') body.reasoning_effort = effort
  }

  let res: Response
  try {
    res = await fetch(`${p.baseUrl}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })
  } catch (e) {
    const ms = Date.now() - started
    console.log(`[llm] ${p.name}/${p.model} FAILED after ${ms}ms: ${(e as Error).message}`)
    const err = new Error(`${p.name} request failed after ${ms}ms: ${(e as Error).message}`) as Error & {
      retryable: boolean
    }
    err.retryable = true
    throw err
  }

  const ms = Date.now() - started
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.log(`[llm] ${p.name}/${p.model} ${res.status} in ${ms}ms: ${text.slice(0, 160)}`)
    const err = new Error(`${p.name} ${res.status} after ${ms}ms: ${text.slice(0, 300)}`) as Error & {
      retryable: boolean
      rateLimited: boolean
    }
    err.retryable = res.status === 429 || res.status >= 500
    err.rateLimited = res.status === 429
    throw err
  }
  console.log(`[llm] ${p.name}/${p.model} ${res.status} in ${ms}ms`)

  const data = (await res.json()) as {
    choices?: Array<{ message?: ChatMsg }>
  }
  const msg = data.choices?.[0]?.message
  if (!msg) throw new Error(`${p.name}: empty response`)
  return { role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await callProvider(p, messages, tools)
      } catch (e) {
        lastError = e as Error
        const err = e as Error & { retryable?: boolean; rateLimited?: boolean }
        if (!err.retryable) throw lastError
        if (err.rateLimited && attempt === 0) {
          await sleep(8000)
          continue
        }
        break
      }
    }
  }
  throw lastError ?? new Error('All LLM providers failed')
}
