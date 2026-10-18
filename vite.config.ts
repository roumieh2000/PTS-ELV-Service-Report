import { defineConfig, loadEnv } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const API_MODULES: Record<string, string> = {
  '/agent': '/api/agent.ts',
  '/quote': '/api/quote.ts',
  '/plan': '/api/plan.ts',
  '/followup-digest': '/api/followup-digest.ts',
}

type NextFunction = () => void

async function handleApiRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
): Promise<void> {
  const rawUrl = req.url ?? ''
  if (!rawUrl.startsWith('/api/')) {
    next()
    return
  }

  const url = new URL(rawUrl, 'http://localhost')
  const route = url.pathname.slice('/api'.length).replace(/\/+$/, '') || '/'
  const modPath = API_MODULES[route]
  if (!modPath) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'not_found' }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const rawBody = Buffer.concat(chunks).toString('utf8')
  let body: unknown
  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = rawBody
    }
  }

  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  try {
    const mod = (await server.ssrLoadModule(modPath)) as {
      default?: (rq: unknown, rs: unknown) => Promise<void> | void
    }
    const handler = mod.default
    if (!handler) throw new Error(`No default export in ${modPath}`)

    const vRes = {
      status(code: number) {
        res.statusCode = code
        return vRes
      },
      setHeader(name: string, value: string) {
        res.setHeader(name, value)
      },
      json(payload: unknown) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(payload))
      },
      send(payload: unknown) {
        if (payload instanceof Uint8Array) {
          res.end(payload)
          return
        }
        res.end(typeof payload === 'string' ? payload : JSON.stringify(payload))
      },
      end() {
        res.end()
      },
    }
    const vReq = {
      method: req.method,
      query,
      body,
      headers: req.headers as Record<string, string | string[] | undefined>,
    }
    await handler(vReq, vRes)
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: (e as Error).message }))
  }
}

function localApiPlugin(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }
      server.middlewares.use((req, res, next) => {
        void handleApiRequest(server, req, res, next)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
