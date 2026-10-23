import { supabase } from './_lib/supabase.js'
import { getHeader, json, methodNotAllowed, type VercelRequest, type VercelResponse } from './_lib/http.js'

interface LoginBody {
  username?: unknown
  password?: unknown
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res)
  if (!supabase) {
    json(res, 500, { error: 'Supabase is not configured' })
    return
  }

  const body = (req.body ?? {}) as LoginBody
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password) {
    json(res, 400, { error: 'username and password are required' })
    return
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle()

  if (error) {
    json(res, 500, { error: 'Login lookup failed' })
    return
  }
  if (!user) {
    json(res, 401, { error: 'Invalid username or password' })
    return
  }

  const forwarded = getHeader(req, 'x-forwarded-for')
  const ip = forwarded.split(',')[0]?.trim() || getHeader(req, 'x-real-ip') || ''

  const { error: logError } = await supabase
    .from('login_logs')
    .insert({ user_id: (user as { id: string }).id, username, ip: ip || null })
  if (logError) {
    json(res, 500, { error: 'Failed to record login' })
    return
  }

  json(res, 200, { user })
}
