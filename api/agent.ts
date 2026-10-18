import { chatComplete, type ChatMsg } from './_lib/llm'
import { systemPrompt } from './_lib/prompt'
import { executeTool, toolDefs, type AgentCtx } from './_lib/tools'
import { json, methodNotAllowed, type VercelRequest, type VercelResponse } from './_lib/http'

export const maxDuration = 60

const MAX_ROUNDS = 6
const MAX_TOOL_ROUNDS = 6
const MAX_HISTORY = 24

interface ClientMsg {
  role: 'user' | 'assistant'
  content: string
}

interface Artifact {
  type: 'quote' | 'plan'
  id: string
  label: string
  path: string
  detail?: string
}

interface UsedTool {
  name: string
  summary: string
}

function sanitizeHistory(raw: unknown): ClientMsg[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m): m is ClientMsg => {
      const o = m as ClientMsg
      return (o?.role === 'user' || o?.role === 'assistant') && typeof o?.content === 'string'
    })
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const body = (req.body ?? {}) as Record<string, unknown>
  const history = sanitizeHistory(body.messages)
  const userObj = (body.user ?? {}) as Record<string, unknown>
  const name = typeof userObj.name === 'string' && userObj.name ? userObj.name : 'Team member'
  const username = typeof userObj.username === 'string' ? userObj.username : ''
  const ctx: AgentCtx = { user: { name, username } }

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    json(res, 400, { error: 'messages must end with a user message' })
    return
  }

  const messages: ChatMsg[] = [{ role: 'system', content: systemPrompt(ctx.user) }]
  for (const m of history) messages.push({ role: m.role, content: m.content })

  const defs = toolDefs()
  const artifacts: Artifact[] = []
  const usedTools: UsedTool[] = []
  const seenTools = new Set<string>()

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const reply = await chatComplete(messages, defs)

      if (reply.tool_calls && reply.tool_calls.length > 0) {
        messages.push({ role: 'assistant', content: reply.content ?? null, tool_calls: reply.tool_calls })
        let toolRounds = 0
        for (const call of reply.tool_calls) {
          toolRounds += 1
          if (toolRounds > MAX_TOOL_ROUNDS) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ ok: false, error: 'too_many_tool_calls' }),
            })
            continue
          }
          const result = await executeTool(call.function.name, call.function.arguments, ctx)
          usedTools.push({ name: call.function.name, summary: result.summary })
          collectArtifacts(call.function.name, result.data, artifacts, seenTools)
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result.data ?? { ok: true }),
          })
        }
        continue
      }

      json(res, 200, {
        reply: reply.content ?? '',
        artifacts,
        toolsUsed: dedupeTools(usedTools),
      })
      return
    }

    json(res, 200, {
      reply: 'I hit my work limit for this request — could you rephrase or ask in a smaller step?',
      artifacts,
      toolsUsed: dedupeTools(usedTools),
    })
  } catch (e) {
    const message = (e as Error).message || 'Agent failed'
    json(res, 502, { error: message, artifacts, toolsUsed: dedupeTools(usedTools) })
  }
}

function dedupeTools(list: UsedTool[]): UsedTool[] {
  const byKey = new Map<string, UsedTool>()
  for (const t of list) {
    const key = `${t.name}:${t.summary}`
    if (!byKey.has(key)) byKey.set(key, t)
  }
  return [...byKey.values()]
}

function collectArtifacts(toolName: string, data: unknown, out: Artifact[], seen: Set<string>): void {
  if (!data || typeof data !== 'object') return
  const d = data as Record<string, unknown>
  if (toolName === 'create_quote' && d.ok && typeof d.id === 'string') {
    if (seen.has(`quote:${d.id}`)) return
    seen.add(`quote:${d.id}`)
    const totals = (d.totals ?? null) as { total?: number; currency?: string } | null
    out.push({
      type: 'quote',
      id: d.id,
      label: String(d.quoteRef ?? 'Quote'),
      path: String(d.downloadPath ?? `/api/quote?id=${d.id}`),
      detail: totals?.total != null
        ? `${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${totals.currency ?? 'AED'}`
        : undefined,
    })
  }
  if (toolName === 'save_plan' && d.ok && typeof d.id === 'string') {
    if (seen.has(`plan:${d.id}`)) return
    seen.add(`plan:${d.id}`)
    out.push({
      type: 'plan',
      id: d.id,
      label: String(d.title ?? 'Plan'),
      path: String(d.viewPath ?? `/assistant?plan=${d.id}`),
    })
  }
}
