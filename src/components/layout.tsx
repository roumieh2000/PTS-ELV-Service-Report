import { Link, Outlet, useNavigate } from 'react-router'
import { FileText, CalendarDays, Database, FolderOpen, LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  staff: 'bg-blue-100 text-blue-800',
  customer: 'bg-green-100 text-green-800',
}

export function Layout() {
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg no-underline">
            <FileText className="size-5 text-blue-600" />
            <span>ELV Service Reports</span>
          </Link>
          <nav className="flex items-center gap-3">
            {user && (
              <>
                <span className="hidden text-sm text-neutral-600 sm:inline">{user.name}</span>
                <Badge className={`text-[10px] ${roleBadge[user.role]}`}>{user.role}</Badge>
                {hasPermission('visits:access') && (
                  <Link to="/visits" className="flex items-center gap-1.5 text-sm text-neutral-500 no-underline transition-colors hover:text-neutral-900">
                    <CalendarDays className="size-4" />
                    <span className="hidden sm:inline">Visits</span>
                  </Link>
                )}
                {hasPermission('console:access') && (
                  <Link to="/console" className="flex items-center gap-1.5 text-sm text-neutral-500 no-underline transition-colors hover:text-neutral-900">
                    <Database className="size-4" />
                    <span className="hidden sm:inline">Console</span>
                  </Link>
                )}
                {hasPermission('projects:manage') && (
                  <Link to="/projects" className="flex items-center gap-1.5 text-sm text-neutral-500 no-underline transition-colors hover:text-neutral-900">
                    <FolderOpen className="size-4" />
                    <span className="hidden sm:inline">Projects</span>
                  </Link>
                )}
                {hasPermission('users:manage') && (
                  <Link to="/users" className="flex items-center gap-1.5 text-sm text-neutral-500 no-underline transition-colors hover:text-neutral-900">
                    <Shield className="size-4" />
                    <span className="hidden sm:inline">Users</span>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
