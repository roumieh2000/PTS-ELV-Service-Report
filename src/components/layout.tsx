import { Link, Outlet } from 'react-router'
import { FileText, Database } from 'lucide-react'

export function Layout() {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg no-underline">
            <FileText className="size-5 text-blue-600" />
            <span>ELV Service Reports</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/console" className="flex items-center gap-1.5 text-sm text-neutral-500 no-underline transition-colors hover:text-neutral-900">
              <Database className="size-4" />
              <span className="hidden sm:inline">Console</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
