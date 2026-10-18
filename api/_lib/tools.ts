import { supabase } from './supabase.js'
import type { ToolDef } from './llm.js'

export interface ToolResult {
  summary: string
  data?: unknown
}

export interface AgentCtx {
  user: { name: string; username: string }
}

interface ToolSpec {
  def: ToolDef
  exec: (args: Record<string, unknown>, ctx: AgentCtx) => Promise<ToolResult>
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function needDb(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('Supabase is not configured (set SUPABASE_URL / SUPABASE_ANON_KEY)')
  return supabase
}

interface FollowUpRow {
  id: string
  client_id: string
  assigned_to: string
  task: string
  due_date: string
  status: string
  created_at: string
  client?: { name: string } | { name: string }[] | null
}

function clientNameOf(row: FollowUpRow): string {
  const c = row.client
  if (Array.isArray(c)) return c[0]?.name ?? ''
  return c?.name ?? ''
}

const FOLLOWUP_STATUSES = ['Open', 'In Progress', 'Done', 'Cancelled']

async function resolveClient(name: string): Promise<
  | { ok: true; id: string; name: string }
  | { ok: false; matches: Array<{ id: string; name: string }> }
> {
  const db = needDb()
  const exact = await db
    .from('crm_clients')
    .select('id, name')
    .ilike('name', name)
    .limit(5)
  const rows = exact.data ?? []
  const exactHit = rows.find((r) => r.name.toLowerCase() === name.toLowerCase())
  if (exactHit) return { ok: true, id: exactHit.id, name: exactHit.name }
  if (rows.length > 0) return { ok: false, matches: rows }
  const partial = await db
    .from('crm_clients')
    .select('id, name')
    .ilike('name', `%${name}%`)
    .limit(5)
  const pRows = partial.data ?? []
  if (pRows.length === 1) return { ok: true, id: pRows[0].id, name: pRows[0].name }
  return { ok: false, matches: pRows }
}

const listFollowUps: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'list_followups',
      description:
        'List CRM follow-up tasks. By default returns only active items (Open / In Progress), sorted by due date. Use filters to find overdue items, items assigned to a person, or items for a specific client.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: FOLLOWUP_STATUSES,
            description: 'Filter by a single status. Omit for all active (Open + In Progress) items.',
          },
          assignedTo: { type: 'string', description: 'Filter by assignee name (exact match).' },
          clientName: { type: 'string', description: 'Filter by client name (partial match).' },
          dueBefore: {
            type: 'string',
            description: 'Only items with due date on or before this ISO date (YYYY-MM-DD). Use today for overdue+today.',
          },
          includeDone: { type: 'boolean', description: 'Include Done/Cancelled items. Default false.' },
          limit: { type: 'number', description: 'Max items to return (default 50).' },
        },
      },
    },
  },
  exec: async (args) => {
    const db = needDb()
    let q = db
      .from('crm_followups')
      .select('*, client:crm_clients(name)')
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(num(args.limit, 50))

    const status = str(args.status)
    const includeDone = bool(args.includeDone, false)
    if (status) q = q.eq('status', status)
    else if (!includeDone) q = q.in('status', ['Open', 'In Progress'])

    const assignedTo = str(args.assignedTo)
    if (assignedTo) q = q.ilike('assigned_to', assignedTo)
    const clientName = str(args.clientName).toLowerCase()
    const dueBefore = str(args.dueBefore)
    if (dueBefore) q = q.lte('due_date', dueBefore)

    const { data, error } = await q
    if (error) throw new Error(`Failed to list follow-ups: ${error.message}`)

    const today = new Date().toISOString().slice(0, 10)
    const items = ((data ?? []) as FollowUpRow[])
      .filter((r) => !clientName || clientNameOf(r).toLowerCase().includes(clientName))
      .map((r) => ({
        id: r.id,
        client: clientNameOf(r),
        task: r.task,
        dueDate: r.due_date,
        overdue: r.due_date !== '' && r.due_date < today && r.status !== 'Done',
        status: r.status,
        assignedTo: r.assigned_to,
      }))
    const overdueCount = items.filter((i) => i.overdue).length
    return {
      summary: `Listed ${items.length} follow-up(s)${overdueCount ? `, ${overdueCount} overdue` : ''}`,
      data: { count: items.length, items },
    }
  },
}

const createFollowUp: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'create_followup',
      description:
        'Create a new CRM follow-up task for a client. The client must already exist in the CRM; if the name does not match exactly, the tool returns candidate clients to clarify with the user.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Client name as it appears in the CRM.' },
          task: { type: 'string', description: 'What needs to be done.' },
          dueDate: { type: 'string', description: 'Due date, ISO format YYYY-MM-DD.' },
          assignedTo: { type: 'string', description: 'Person responsible (team member display name).' },
        },
        required: ['clientName', 'task'],
      },
    },
  },
  exec: async (args, ctx) => {
    const db = needDb()
    const clientName = str(args.clientName)
    const task = str(args.task)
    if (!clientName || !task) throw new Error('clientName and task are required')

    const resolved = await resolveClient(clientName)
    if (!resolved.ok) {
      return {
        summary: resolved.matches.length
          ? 'No exact client match — needs clarification'
          : 'Client not found in CRM',
        data: {
          ok: false,
          error: resolved.matches.length ? 'ambiguous_client' : 'client_not_found',
          matches: resolved.matches,
          hint: resolved.matches.length
            ? 'Ask the user which of the matching clients they mean, then retry.'
            : 'The client must be created in CRM first (Add Client). Tell the user.',
        },
      }
    }

    const now = new Date().toISOString()
    const row = {
      client_id: resolved.id,
      assigned_to: str(args.assignedTo, ctx.user.name),
      task,
      due_date: str(args.dueDate),
      status: 'Open',
      created_at: now,
      updated_at: now,
    }
    const { error } = await db.from('crm_followups').insert(row)
    if (error) throw new Error(`Failed to create follow-up: ${error.message}`)
    return {
      summary: `Created follow-up for ${resolved.name}${row.due_date ? ` due ${row.due_date}` : ''} (assigned to ${row.assigned_to})`,
      data: { ok: true, client: resolved.name, ...row },
    }
  },
}

const updateFollowUp: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'update_followup',
      description:
        'Update an existing follow-up (from list_followups results). Only provided fields change. Use id from a previous list.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Follow-up id (uuid).' },
          status: { type: 'string', enum: FOLLOWUP_STATUSES },
          task: { type: 'string' },
          dueDate: { type: 'string', description: 'ISO date YYYY-MM-DD, or empty string to clear.' },
          assignedTo: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  exec: async (args) => {
    const db = needDb()
    const id = str(args.id)
    if (!id) throw new Error('id is required')
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const status = str(args.status)
    if (status) {
      if (!FOLLOWUP_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`)
      patch.status = status
    }
    if (typeof args.task === 'string') patch.task = args.task
    if (typeof args.dueDate === 'string') patch.due_date = args.dueDate
    if (typeof args.assignedTo === 'string') patch.assigned_to = args.assignedTo

    const { data, error } = await db
      .from('crm_followups')
      .update(patch)
      .eq('id', id)
      .select('id, task, status')
      .single()
    if (error) throw new Error(`Failed to update follow-up: ${error.message}`)
    return {
      summary: `Updated follow-up "${data.task}" → ${data.status}`,
      data: { ok: true, id: data.id, status: data.status },
    }
  },
}

const listClients: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'list_clients',
      description: 'Search CRM clients by name, contact person, or phone.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  exec: async (args) => {
    const db = needDb()
    const search = str(args.search)
    let q = db.from('crm_clients').select('id, name, contact_person, phone, email, city').order('name').limit(num(args.limit, 20))
    if (search) {
      q = db
        .from('crm_clients')
        .select('id, name, contact_person, phone, email, city')
        .or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`)
        .order('name')
        .limit(num(args.limit, 20))
    }
    const { data, error } = await q
    if (error) throw new Error(`Failed to list clients: ${error.message}`)
    const items = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contact_person,
      phone: c.phone,
      email: c.email,
      city: c.city,
    }))
    return { summary: `Found ${items.length} client(s)`, data: { count: items.length, items } }
  },
}

const searchReports: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'search_reports',
      description:
        'Search recent service reports (doc ref, client, work done, status). Useful for context when preparing quotes or follow-ups after a job.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Partial client name.' },
          docRef: { type: 'string', description: 'Exact or partial document reference, e.g. SR-2026.' },
          limit: { type: 'number' },
        },
      },
    },
  },
  exec: async (args) => {
    const db = needDb()
    const limit = num(args.limit, 10)
    let q = db
      .from('reports')
      .select('id, doc_ref, date, client_name, project_name, job_types, resolution_status, actions_taken')
      .order('date', { ascending: false })
      .limit(limit)
    const clientName = str(args.clientName)
    const docRef = str(args.docRef)
    if (clientName) q = q.ilike('client_name', `%${clientName}%`)
    if (docRef) q = q.ilike('doc_ref', `%${docRef}%`)
    const { data, error } = await q
    if (error) throw new Error(`Failed to search reports: ${error.message}`)
    const items = (data ?? []).map((r) => ({
      docRef: r.doc_ref,
      date: r.date,
      client: r.client_name,
      project: r.project_name,
      jobTypes: r.job_types,
      status: r.resolution_status,
      actionsTaken: (r.actions_taken ?? '').slice(0, 300),
    }))
    return { summary: `Found ${items.length} report(s)`, data: { count: items.length, items } }
  },
}

const listUsers: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'list_users',
      description: 'List team members (name, username, role) — useful to pick a valid assignee for follow-ups.',
      parameters: { type: 'object', properties: {} },
    },
  },
  exec: async () => {
    const db = needDb()
    const { data, error } = await db.from('users').select('name, username, role').order('name')
    if (error) throw new Error(`Failed to list users: ${error.message}`)
    const items = (data ?? []).map((u) => ({ name: u.name || u.username, username: u.username, role: u.role }))
    return { summary: `Found ${items.length} team member(s)`, data: { count: items.length, items } }
  },
}

export interface QuoteItem {
  description: string
  qty: number
  unit: string
  unitPrice: number
}

export interface QuoteTotals {
  subtotal: number
  discount: number
  vat: number
  total: number
  currency: string
}

export function quoteTotals(
  items: QuoteItem[],
  vatPercent: number,
  discount: number,
  currency: string,
): QuoteTotals {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const vat = (subtotal - discount) * (vatPercent / 100)
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    vat: round2(vat),
    total: round2(subtotal - discount + vat),
    currency,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sanitizeItems(raw: unknown): QuoteItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((i) => {
    const o = (i ?? {}) as Record<string, unknown>
    return {
      description: str(o.description),
      qty: num(o.qty, 1),
      unit: str(o.unit, 'unit'),
      unitPrice: num(o.unitPrice ?? o.unit_price, 0),
    }
  }).filter((i) => i.description && i.qty > 0)
}

const createQuote: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'create_quote',
      description:
        'Create a client quotation and get a downloadable Excel (.xlsx) link. Prices are per unit; VAT default 5% (UAE). Always confirm line items with the user before creating if details were not explicitly given.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          projectName: { type: 'string' },
          items: {
            type: 'array',
            description: 'Quote line items.',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                qty: { type: 'number' },
                unit: { type: 'string', description: 'e.g. unit, lot, meter, day' },
                unitPrice: { type: 'number' },
              },
              required: ['description', 'qty', 'unitPrice'],
            },
          },
          currency: { type: 'string', description: 'ISO currency, default AED.' },
          vatPercent: { type: 'number', description: 'VAT percentage, default 5.' },
          discount: { type: 'number', description: 'Flat discount amount subtracted before VAT.' },
          notes: { type: 'string' },
          preparedBy: { type: 'string', description: 'Defaults to the requesting user.' },
        },
        required: ['clientName', 'items'],
      },
    },
  },
  exec: async (args, ctx) => {
    const db = needDb()
    const clientName = str(args.clientName)
    const items = sanitizeItems(args.items)
    if (!clientName) throw new Error('clientName is required')
    if (items.length === 0) throw new Error('At least one valid item is required (description, qty > 0, unitPrice)')

    const currency = str(args.currency, 'AED').toUpperCase()
    const vatPercent = num(args.vatPercent, 5)
    const discount = num(args.discount, 0)
    const totals = quoteTotals(items, vatPercent, discount, currency)

    const { count } = await db.from('quotes').select('id', { count: 'exact', head: true })
    const year = new Date().getFullYear()
    const quoteRef = `Q-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`

    const row = {
      quote_ref: quoteRef,
      client_name: clientName,
      project_name: str(args.projectName),
      prepared_by: str(args.preparedBy, ctx.user.name),
      currency,
      vat_percent: vatPercent,
      discount,
      notes: str(args.notes),
      items,
      totals,
    }
    const { data, error } = await db.from('quotes').insert(row).select('id, quote_ref').single()
    if (error) throw new Error(`Failed to create quote: ${error.message}`)

    return {
      summary: `Created quote ${quoteRef} for ${clientName} — ${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`,
      data: {
        ok: true,
        id: data.id,
        quoteRef: data.quote_ref,
        totals,
        downloadPath: `/api/quote?id=${data.id}`,
      },
    }
  },
}

const listQuotes: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'list_quotes',
      description: 'List previously created quotes (newest first).',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Partial client name filter.' },
          limit: { type: 'number' },
        },
      },
    },
  },
  exec: async (args) => {
    const db = needDb()
    let q = db
      .from('quotes')
      .select('id, quote_ref, client_name, project_name, created_at, totals')
      .order('created_at', { ascending: false })
      .limit(num(args.limit, 10))
    const clientName = str(args.clientName)
    if (clientName) q = q.ilike('client_name', `%${clientName}%`)
    const { data, error } = await q
    if (error) throw new Error(`Failed to list quotes: ${error.message}`)
    const items = (data ?? []).map((q2) => ({
      id: q2.id,
      quoteRef: q2.quote_ref,
      client: q2.client_name,
      project: q2.project_name,
      total: (q2.totals as unknown as QuoteTotals | null)?.total ?? null,
      currency: (q2.totals as unknown as QuoteTotals | null)?.currency ?? 'AED',
      createdAt: q2.created_at,
      downloadPath: `/api/quote?id=${q2.id}`,
    }))
    return { summary: `Found ${items.length} quote(s)`, data: { count: items.length, items } }
  },
}

export interface PlanNode {
  label: string
  hours?: number
  children?: PlanNode[]
}

function sanitizePlanNode(raw: unknown, depth: number, counter: { n: number }): PlanNode | null {
  if (depth > 6 || counter.n > 120) return null
  const o = (raw ?? {}) as Record<string, unknown>
  const label = str(o.label)
  if (!label) return null
  counter.n += 1
  const node: PlanNode = { label: label.slice(0, 120) }
  const hours = num(o.hours, NaN)
  if (Number.isFinite(hours) && hours >= 0) node.hours = round2(hours)
  if (Array.isArray(o.children)) {
    const kids = o.children
      .map((c) => sanitizePlanNode(c, depth + 1, counter))
      .filter((c): c is PlanNode => c !== null)
    if (kids.length > 0) node.children = kids
  }
  return node
}

const savePlan: ToolSpec = {
  def: {
    type: 'function',
    function: {
      name: 'save_plan',
      description:
        'Save a strategy / growth plan as a mind map. The root is the goal; children are branches with optional estimated hours. Use when the user asks for a plan, roadmap, mind map, or time allocation.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short plan title, e.g. "Q1 Growth Plan".' },
          root: {
            type: 'object',
            description: 'Root node of the mind map.',
            properties: {
              label: { type: 'string' },
              hours: { type: 'number', description: 'Optional total hours for this branch.' },
              children: { type: 'array', items: { type: 'object' } },
            },
            required: ['label'],
          },
        },
        required: ['title', 'root'],
      },
    },
  },
  exec: async (args, ctx) => {
    const db = needDb()
    const title = str(args.title)
    const root = sanitizePlanNode(args.root, 0, { n: 0 })
    if (!title || !root) throw new Error('title and a valid root node (with label) are required')
    const now = new Date().toISOString()
    const { data, error } = await db
      .from('plans')
      .insert({ title, content: root, created_by: ctx.user.name, created_at: now, updated_at: now })
      .select('id, title')
      .single()
    if (error) throw new Error(`Failed to save plan: ${error.message}`)
    return {
      summary: `Saved plan "${data.title}"`,
      data: { ok: true, id: data.id, title: data.title, viewPath: `/assistant?plan=${data.id}` },
    }
  },
}

export const tools: Record<string, ToolSpec> = {
  list_followups: listFollowUps,
  create_followup: createFollowUp,
  update_followup: updateFollowUp,
  list_clients: listClients,
  search_reports: searchReports,
  list_users: listUsers,
  create_quote: createQuote,
  list_quotes: listQuotes,
  save_plan: savePlan,
}

export function toolDefs(): ToolDef[] {
  return Object.values(tools).map((t) => t.def)
}

export async function executeTool(
  name: string,
  rawArgs: string,
  ctx: AgentCtx,
): Promise<ToolResult> {
  const spec = tools[name]
  if (!spec) return { summary: `Unknown tool: ${name}`, data: { ok: false, error: 'unknown_tool' } }
  let args: Record<string, unknown>
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {}
  } catch {
    return { summary: `${name}: invalid JSON arguments`, data: { ok: false, error: 'invalid_arguments' } }
  }
  try {
    return await spec.exec(args, ctx)
  } catch (e) {
    return { summary: `${name} failed: ${(e as Error).message}`, data: { ok: false, error: (e as Error).message } }
  }
}
