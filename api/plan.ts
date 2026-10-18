import { supabase } from './_lib/supabase'
import { getQuery, json, methodNotAllowed, type VercelRequest, type VercelResponse } from './_lib/http'

interface PlanRow {
  id: string
  title: string
  content: unknown
  created_by: string
  created_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(res)
  if (!supabase) {
    json(res, 500, { error: 'Supabase is not configured' })
    return
  }

  const id = getQuery(req, 'id')
  if (!id) {
    json(res, 400, { error: 'id query parameter is required' })
    return
  }

  const { data, error } = await supabase
    .from('plans')
    .select('id, title, content, created_by, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    json(res, 404, { error: 'Plan not found' })
    return
  }

  const row = data as unknown as PlanRow
  json(res, 200, {
    id: row.id,
    title: row.title,
    root: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
  })
}
