import { type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import type { Permission } from '@/types/auth'

interface ProtectedRouteProps {
  permission?: Permission
  children?: ReactNode
}

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!user) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />
  return children ? <>{children}</> : <Outlet />
}
