type Level = 'info' | 'warn' | 'error'

export function log(level: Level, message: string, data?: unknown) {
  const entry = { level, message, data, timestamp: new Date().toISOString() }
  queueMicrotask(() => {
    if (level === 'error') console.error(entry)
    else console[level](entry)
  })
}
