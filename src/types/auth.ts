export type Role = 'admin' | 'staff' | 'customer'

export type Permission =
  | 'reports:read'
  | 'reports:create'
  | 'reports:edit'
  | 'reports:delete'
  | 'reports:export'
  | 'reports:sign'
  | 'visits:access'
  | 'console:access'
  | 'console:write'
  | 'projects:manage'
  | 'users:manage'

export interface User {
  id: string
  username: string
  password: string
  role: Role
  name: string
  clientName?: string
  permissions?: Permission[]
}

export const rolePermissions: Record<Role, Permission[]> = {
  admin: ['reports:read', 'reports:create', 'reports:edit', 'reports:delete', 'reports:export', 'reports:sign', 'visits:access', 'console:access', 'console:write', 'projects:manage', 'users:manage'],
  staff: ['reports:read', 'reports:create', 'reports:edit', 'reports:export', 'reports:sign', 'visits:access', 'console:access', 'console:write'],
  customer: ['reports:read', 'reports:export', 'reports:sign'],
}

export const allPermissions: Permission[] = [
  'reports:read',
  'reports:create',
  'reports:edit',
  'reports:delete',
  'reports:export',
  'reports:sign',
  'visits:access',
  'console:access',
  'console:write',
  'projects:manage',
  'users:manage',
]

export const permissionLabels: Record<Permission, string> = {
  'reports:read': 'View Reports',
  'reports:create': 'Create Reports',
  'reports:edit': 'Edit Reports',
  'reports:delete': 'Delete Reports',
  'reports:export': 'Export / Share',
  'reports:sign': 'Sign Report',
  'visits:access': 'Access Visits',
  'console:access': 'Access Console',
  'console:write': 'Console Edit',
  'projects:manage': 'Manage Project Codes',
  'users:manage': 'Manage Users',
}
