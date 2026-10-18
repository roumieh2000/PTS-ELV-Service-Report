import { supabase } from './_lib/supabase'
import { getHeader, json, type VercelRequest, type VercelResponse } from './_lib/http'

interface FollowUpRow {
  id: string
  task: string
  due_date: string
  assigned_to: string
  status: string
  client?: { name: string } | { name: string }[] | null
}

function clientNameOf(row: FollowUpRow): string {
  const c = row.client
  if (Array.isArray(c)) return c[0]?.name ?? ''
  return c?.name ?? ''
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'method_not_allowed' })
    return
  }

  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = getHeader(req, 'authorization')
    if (auth && auth !== `Bearer ${secret}`) {
      json(res, 401, { error: 'unauthorized' })
      return
    }
  }

  if (!supabase) {
    json(res, 500, { error: 'Supabase is not configured' })
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('crm_followups')
    .select('id, task, due_date, assigned_to, status, client:crm_clients(name)')
    .in('status', ['Open', 'In Progress'])
    .order('due_date', { ascending: true })

  if (error) {
    json(res, 500, { error: error.message })
    return
  }

  const all = (data ?? []) as FollowUpRow[]
  const map = (r: FollowUpRow) => ({
    id: r.id,
    client: clientNameOf(r),
    task: r.task,
    dueDate: r.due_date,
    assignedTo: r.assigned_to,
    status: r.status,
  })

  const overdue = all.filter((r) => r.due_date !== '' && r.due_date < today).map(map)
  const dueToday = all.filter((r) => r.due_date === today).map(map)
  const upcoming = all
    .filter((r) => r.due_date > today && r.due_date <= inSevenDays)
    .map(map)

  json(res, 200, {
    date: today,
    counts: { overdue: overdue.length, dueToday: dueToday.length, upcoming: upcoming.length },
    overdue,
    dueToday,
    upcoming,
  })
}
