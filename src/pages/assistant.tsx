import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'
import type {
  AgentReply,
  ChatArtifact,
  Digest,
  Plan,
  PlanNode,
  UsedTool,
} from '@/types/assistant'
import {
  Bot,
  Send,
  Sparkles,
  Wrench,
  FileSpreadsheet,
  Network,
  AlertTriangle,
  RefreshCw,
  Trash2,
} from 'lucide-react'

interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: UsedTool[]
  artifacts?: ChatArtifact[]
  error?: boolean
}

const SUGGESTIONS = [
  'What follow-ups are overdue today?',
  'Make a mind map to plan my month for growing the business',
  'Draft a quote for a CCTV upgrade — 8 cameras, 4,500 AED total, plus NVR 6,800 AED',
  'Show open follow-ups assigned to me',
]

const DEPTH_COLORS = ['#1d4ed8', '#0e7490', '#047857', '#7c3aed', '#b45309', '#be123c', '#334155']
const COL_W = 270
const ROW_H = 54
const BOX_H = 40

interface Placed {
  x: number
  y: number
  w: number
  label: string
  fullLabel: string
  depth: number
  children: Placed[]
}

function placeNodes(root: PlanNode): { tree: Placed; width: number; height: number } {
  const state = { leaf: 0, maxDepth: 0 }

  function place(node: PlanNode, depth: number): Placed {
    state.maxDepth = Math.max(state.maxDepth, depth)
    const fullLabel = node.label + (node.hours != null ? ` · ${node.hours}h` : '')
    const w = Math.min(250, Math.max(110, fullLabel.length * 7 + 24))
    const x = 10 + depth * COL_W
    const kids = node.children ?? []
    if (kids.length === 0) {
      const y = 12 + state.leaf * ROW_H
      state.leaf += 1
      return { x, y, w, label: fullLabel, fullLabel, depth, children: [] }
    }
    const placedKids = kids.map((k) => place(k, depth + 1))
    const first = placedKids[0]
    const last = placedKids[placedKids.length - 1]
    return {
      x,
      y: (first.y + last.y) / 2,
      w,
      label: fullLabel,
      fullLabel,
      depth,
      children: placedKids,
    }
  }

  const tree = place(root, 0)
  const width = (state.maxDepth + 1) * COL_W + 40
  const height = Math.max(state.leaf * ROW_H + 24, 80)
  return { tree, width, height }
}

function MindMap({ root }: { root: PlanNode }) {
  const { tree, width, height } = useMemo(() => placeNodes(root), [root])

  function truncate(label: string, w: number): string {
    const max = Math.floor((w - 20) / 7)
    return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label
  }

  function renderNode(p: Placed, key: string): React.ReactNode {
    const color = DEPTH_COLORS[p.depth % DEPTH_COLORS.length]
    const midX = p.x + p.w / 2
    return (
      <g key={key}>
        {p.children.map((c, i) => {
          const startX = p.x + p.w
          const startY = p.y + BOX_H / 2
          const endX = c.x
          const endY = c.y + BOX_H / 2
          const bend = startX + (endX - startX) / 2
          return (
            <path
              key={`${key}-e${i}`}
              d={`M ${startX} ${startY} H ${bend} V ${endY} H ${endX}`}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              fill="none"
            />
          )
        })}
        {p.children.map((c, i) => renderNode(c, `${key}-${i}`))}
        <rect x={p.x} y={p.y} width={p.w} height={BOX_H} rx={8} fill={color} />
        <text
          x={midX}
          y={p.y + BOX_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={12}
          fontWeight={p.depth === 0 ? 700 : 500}
        >
          <title>{p.fullLabel}</title>
          {truncate(p.label, p.w)}
        </text>
      </g>
    )
  }

  return (
    <div className="overflow-auto rounded-lg border bg-white p-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {renderNode(tree, 'n')}
      </svg>
    </div>
  )
}

function toolLabel(name: string): string {
  return name.replace(/_/g, ' ')
}

export function Assistant() {
  const user = useAuthStore((s) => s.user)
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planError, setPlanError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const planParam = searchParams.get('plan')

  const loadPlan = useCallback(async (id: string) => {
    setPlanError('')
    try {
      const res = await fetch(`/api/plan?id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('Plan not found')
      setPlan((await res.json()) as Plan)
    } catch (e) {
      setPlanError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    fetch('/api/followup-digest')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Digest | null) => {
        if (d?.counts) setDigest(d)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (planParam) void loadPlan(planParam)
  }, [planParam, loadPlan])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    setBusy(true)

    const userMsg: UiMessage = { id: crypto.randomUUID(), role: 'user', content }
    const history = [...messages.filter((m) => !m.error), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          user: { name: user?.name ?? '', username: user?.username ?? '' },
        }),
      })
      const text = await res.text()
      let data: (AgentReply & { error?: string }) | null = null
      try {
        data = JSON.parse(text) as AgentReply & { error?: string }
      } catch {
        data = null
      }
      if (!res.ok || !data) {
        const looksLikeHtml = /<\s*(!doctype|html)/i.test(text)
        let msg: string
        if (!text.trim()) {
          msg = `Empty response from the server (HTTP ${res.status}).`
        } else if (looksLikeHtml) {
          msg =
            res.status === 404
              ? 'Assistant API not found (404). Run `npm run dev` locally (it now includes the API) or deploy to Vercel.'
              : `The server returned a web page instead of the API (HTTP ${res.status}). The function may have crashed or timed out — check the Vercel function logs.`
        } else if (!data) {
          msg = `Assistant API returned non-JSON (HTTP ${res.status}): ${text.slice(0, 150)}`
        } else {
          msg = data.error ?? 'Something went wrong. Check that GEMINI_API_KEY is set in the environment.'
        }
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: msg, error: true },
        ])
        return
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply || '(no reply)',
          tools: data.toolsUsed?.length ? data.toolsUsed : undefined,
          artifacts: data.artifacts?.length ? data.artifacts : undefined,
        },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Network error: ${(e as Error).message}`,
          error: true,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  function clearChat() {
    setMessages([])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Assistant</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} disabled={busy || messages.length === 0}>
          <Trash2 className="size-4" />
          New chat
        </Button>
      </div>

      {digest && (digest.counts.overdue > 0 || digest.counts.dueToday > 0 || digest.counts.upcoming > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {digest.counts.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-700">
              <AlertTriangle className="size-3.5" />
              {digest.counts.overdue} overdue
            </span>
          )}
          {digest.counts.dueToday > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
              {digest.counts.dueToday} due today
            </span>
          )}
          {digest.counts.upcoming > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
              {digest.counts.upcoming} due in 7 days
            </span>
          )}
          <a href="/crm" className="text-xs text-neutral-500 underline hover:text-neutral-800">
            Open CRM
          </a>
        </div>
      )}

      <Card className="flex h-[min(70dvh,640px)] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Sparkles className="size-8 text-blue-500" />
              <div>
                <p className="font-medium">Ask me about your day</p>
                <p className="text-sm text-neutral-500">
                  Follow-ups, quotes, and growth planning — I work with your CRM data.
                </p>
              </div>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border bg-white px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:border-blue-300 hover:text-blue-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : m.error
                      ? 'border border-red-200 bg-red-50 text-red-800'
                      : 'bg-neutral-100 text-neutral-900'
                }`}
              >
                {m.tools && m.tools.length > 0 && (
                  <div className="mb-2 space-y-1 border-b border-neutral-200 pb-2">
                    {m.tools.map((t, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-neutral-500">
                        <Wrench className="mt-0.5 size-3 shrink-0" />
                        <span>
                          <span className="font-medium">{toolLabel(t.name)}</span> — {t.summary}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.artifacts && m.artifacts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.artifacts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-neutral-800">
                          {a.type === 'quote' ? (
                            <FileSpreadsheet className="size-4 text-emerald-600" />
                          ) : (
                            <Network className="size-4 text-violet-600" />
                          )}
                          <div>
                            <div className="text-xs font-semibold">{a.label}</div>
                            {a.detail && <div className="text-[11px] text-neutral-500">{a.detail}</div>}
                          </div>
                        </div>
                        {a.type === 'quote' ? (
                          <a
                            href={a.path}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white no-underline hover:bg-emerald-700"
                          >
                            Download .xlsx
                          </a>
                        ) : (
                          <button
                            onClick={() => void loadPlan(a.id)}
                            className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                          >
                            View mind map
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm text-neutral-500">
                <RefreshCw className="size-4 animate-spin" />
                Working…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t bg-white p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              rows={2}
              placeholder="Ask about follow-ups, request a quote, or plan your month…"
              className="min-h-[52px] resize-none"
            />
            <Button onClick={() => void send(input)} disabled={busy || !input.trim()} size="icon-lg">
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-400">
            Enter to send · Shift+Enter for a new line · Answers use free LLMs (Gemini/Groq)
          </p>
        </div>
      </Card>

      <Dialog open={!!plan || !!planError} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="size-4 text-violet-600" />
              {plan?.title ?? 'Plan'}
            </DialogTitle>
          </DialogHeader>
          {planError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {planError}
            </div>
          ) : plan ? (
            <div className="space-y-2">
              <MindMap root={plan.root} />
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Badge className="bg-violet-100 text-violet-800">mind map</Badge>
                {plan.createdBy && <span>by {plan.createdBy}</span>}
                <span>{String(plan.createdAt).slice(0, 10)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-8 text-sm text-neutral-500">
              <RefreshCw className="size-4 animate-spin" />
              Loading plan…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
