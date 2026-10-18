export interface VercelRequest {
  method?: string
  query?: Record<string, string | string[] | undefined>
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

export interface VercelResponse {
  status(code: number): VercelResponse
  setHeader(name: string, value: string): void
  json(body: unknown): void
  send(body: unknown): void
  end(): void
}

export function getHeader(req: VercelRequest, name: string): string {
  const v = req.headers[name]
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

export function getQuery(req: VercelRequest, name: string): string {
  const v = req.query?.[name]
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body)
}

export function methodNotAllowed(res: VercelResponse): void {
  json(res, 405, { error: 'method_not_allowed' })
}
