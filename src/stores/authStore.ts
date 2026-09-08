import { create } from 'zustand'
import type { User, Role, Permission } from '@/types/auth'
import { rolePermissions } from '@/types/auth'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

const SESSION_KEY = 'elv-session-user'

interface AuthStore {
  user: User | null
  users: User[]
  loading: boolean
  loadUsers: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (perm: Permission) => boolean
  hasRole: (role: Role) => boolean
  addUser: (data: Omit<User, 'id'>) => Promise<User | null>
  updateUser: (id: string, data: Partial<Omit<User, 'id'>>) => Promise<void>
  removeUser: (id: string) => Promise<void>
}

interface UserRow {
  id: string
  username: string
  password: string
  role: Role
  name: string
  client_name: string | null
  permissions: Permission[] | null
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role,
    name: row.name,
    clientName: row.client_name ?? undefined,
    permissions: row.permissions ?? undefined,
  }
}

function getUserPermissions(user: User): Permission[] {
  return user.permissions ?? rolePermissions[user.role]
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })(),
  users: [],
  loading: false,

  loadUsers: async () => {
    const { data, error } = await supabase.from('users').select('*').order('name')
    if (error) {
      log('error', 'Failed to load users', error)
      return
    }
    const users = (data ?? ([] as UserRow[])).map(toUser)
    set({ users })
    const current = get().user
    if (current) {
      const fresh = users.find((u) => u.id === current.id)
      if (fresh) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(fresh))
        set({ user: fresh })
      }
    }
  },

  login: async (username, password) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle()
    if (!data) {
      log('warn', 'Login failed', { username })
      return false
    }
    const found = toUser(data)
    localStorage.setItem(SESSION_KEY, JSON.stringify(found))
    set({ user: found })
    log('info', 'Login success', { username, role: found.role })
    return true
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ user: null })
    log('info', 'User logged out')
  },

  hasPermission: (perm) => {
    const { user } = get()
    if (!user) return false
    return getUserPermissions(user).includes(perm)
  },

  hasRole: (role) => {
    const { user } = get()
    return user?.role === role
  },

  addUser: async (data) => {
    const row = {
      username: data.username,
      password: data.password,
      role: data.role,
      name: data.name,
      client_name: data.clientName ?? null,
      permissions: data.permissions ?? null,
    }
    const { data: inserted, error } = await supabase.from('users').insert(row).select().single()
    if (error) {
      log('error', 'Failed to add user', error)
      return null
    }
    const user = toUser(inserted as UserRow)
    set((s) => ({ users: [...s.users, user] }))
    log('info', 'User added', { username: data.username, role: data.role })
    return user
  },

  updateUser: async (id, data) => {
    const patch: Record<string, unknown> = {}
    if (data.username !== undefined) patch.username = data.username
    if (data.password !== undefined) patch.password = data.password
    if (data.role !== undefined) patch.role = data.role
    if (data.name !== undefined) patch.name = data.name
    if (data.clientName !== undefined) patch.client_name = data.clientName ?? null
    if (data.permissions !== undefined) patch.permissions = data.permissions

    const { error } = await supabase.from('users').update(patch).eq('id', id)
    if (error) {
      log('error', 'Failed to update user', error)
      return
    }
    const refreshed = (await supabase.from('users').select('*').eq('id', id).single()).data as UserRow
    const users = get().users.map((u) => (u.id === id ? toUser(refreshed) : u))
    set({ users })
    if (get().user?.id === id) {
      const fresh = users.find((u) => u.id === id)!
      localStorage.setItem(SESSION_KEY, JSON.stringify(fresh))
      set({ user: fresh })
    }
  },

  removeUser: async (id) => {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) {
      log('error', 'Failed to delete user', error)
      return
    }
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    if (get().user?.id === id) {
      localStorage.removeItem(SESSION_KEY)
      set({ user: null })
    }
  },
}))
