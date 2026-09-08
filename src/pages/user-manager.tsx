import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import type { User, Role, Permission } from '@/types/auth'
import { allPermissions, permissionLabels, rolePermissions } from '@/types/auth'
import { Plus, Pencil, Trash2, Save, Shield, Users } from 'lucide-react'

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  staff: 'bg-blue-100 text-blue-800',
  customer: 'bg-green-100 text-green-800',
}

interface FormState {
  username: string
  password: string
  name: string
  role: Role
  clientName: string
  permissions: Permission[]
}

function defaultForm(role: Role = 'staff'): FormState {
  return {
    username: '',
    password: '',
    name: '',
    role,
    clientName: '',
    permissions: [...rolePermissions[role]],
  }
}

function userToForm(u: User): FormState {
  return {
    username: u.username,
    password: '',
    name: u.name,
    role: u.role,
    clientName: u.clientName ?? '',
    permissions: [...(u.permissions ?? rolePermissions[u.role])],
  }
}

export function UserManager() {
  const users = useAuthStore((s) => s.users)
  const addUser = useAuthStore((s) => s.addUser)
  const updateUser = useAuthStore((s) => s.updateUser)
  const removeUser = useAuthStore((s) => s.removeUser)
  const currentUser = useAuthStore((s) => s.user)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState('')

  function openAdd() {
    setForm(defaultForm())
    setEditingId(null)
    setError('')
    setDialogOpen(true)
  }

  function openEdit(u: User) {
    setForm(userToForm(u))
    setEditingId(u.id)
    setError('')
    setDialogOpen(true)
  }

  function handleRoleChange(role: Role) {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: [...rolePermissions[role]],
    }))
  }

  function togglePermission(perm: Permission) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  async function handleSave() {
    setError('')
    if (!form.username.trim()) { setError('Username is required'); return }
    if (!editingId && !form.password.trim()) { setError('Password is required'); return }
    if (!form.name.trim()) { setError('Name is required'); return }
    if (form.permissions.length === 0) { setError('Select at least one permission'); return }

    const data = {
      username: form.username.trim(),
      password: editingId && !form.password.trim()
        ? users.find((u) => u.id === editingId)?.password ?? ''
        : form.password,
      name: form.name.trim(),
      role: form.role,
      clientName: form.role === 'customer' ? form.clientName.trim() || undefined : undefined,
      permissions: form.permissions,
    }

    if (editingId) {
      await updateUser(editingId, data)
    } else {
      await addUser(data)
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await removeUser(id)
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-blue-600" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Permissions</th>
                <th className="w-24 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-neutral-500">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const perms = u.permissions ?? rolePermissions[u.role]
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                      <td className="px-3 py-2">
                        {u.name}
                        {u.id === currentUser?.id && <span className="ml-1 text-[10px] text-neutral-400">(you)</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] ${roleBadge[u.role]}`}>{u.role}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {perms.map((p) => (
                            <Badge key={p} variant="secondary" className="text-[10px]">{permissionLabels[p]}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {u.id !== currentUser?.id && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-xs" onClick={() => openEdit(u)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(u.id)}>
                              <Trash2 className="size-3 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Users className="mr-2 inline size-4" />
              {editingId ? 'Edit User' : 'Add User'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{editingId ? 'New Password (leave blank to keep)' : 'Password'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => handleRoleChange(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'customer' && (
              <div className="space-y-1">
                <Label>Client Name (for report filtering)</Label>
                <Input value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} />
              </div>
            )}

            <Separator />

            <div className="space-y-1">
              <Label className="text-sm font-medium">Permissions</Label>
              <p className="text-[10px] text-muted-foreground">Defaults are pre-set from role. Toggle individually.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {allPermissions.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    {permissionLabels[perm]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="size-4" />
              {editingId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The user will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
