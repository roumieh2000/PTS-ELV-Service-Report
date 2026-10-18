import { supabase } from './_lib/supabase.js'
import { getHeader, json, methodNotAllowed, type VercelRequest, type VercelResponse } from './_lib/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res)
  if (!supabase) {
    json(res, 500, { error: 'Supabase is not configured' })
    return
  }

  const body = (req.body ?? {}) as { userId?: unknown; username?: unknown }
  const userId = typeof body.userId === 'string' ? body.userId : ''
  const username = typeof body.username === 'string' ? body.username : ''
  if (!userId || !username) {
    json(res, 400, { error: 'userId and username are required' })
    return
  }

  const forwarded = getHeader(req, 'x-forwarded-for')
  const ip = forwarded.split(',')[0]?.trim() || getHeader(req, 'x-real-ip') || ''

  const { error } = await supabase
    .from('login_logs')
    .insert({ user_id: userId, username, ip: ip || null })
  if (error) {
    json(res, 500, { error: 'Failed to record login' })
    return
  }
  json(res, 200, { ok: true })
}
