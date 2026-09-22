import { create } from 'zustand'
import type { CrmClient } from '@/types/crm'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface CrmClientStore {
  clients: CrmClient[]
  loading: boolean
  loadClients: () => Promise<void>
  addClient: (data: Omit<CrmClient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CrmClient | null>
  updateClient: (id: string, data: Partial<CrmClient>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  findByName: (name: string) => CrmClient | undefined
}

interface ClientRow {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  city: string
  notes: string | null
  created_at: string
  updated_at: string
}

function toClient(row: ClientRow): CrmClient {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const useCrmClientStore = create<CrmClientStore>((set, get) => ({
  clients: [],
  loading: false,

  loadClients: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .order('name', { ascending: true })
    set({ loading: false })
    if (error) {
      log('error', 'Failed to load CRM clients', error)
      return
    }
    set({ clients: (data ?? ([] as ClientRow[])).map(toClient) })
  },

  addClient: async (data) => {
    const now = new Date().toISOString()
    const row = {
      name: data.name,
      contact_person: data.contactPerson,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    }
    const { data: inserted, error } = await supabase.from('crm_clients').insert(row).select().single()
    if (error) {
      log('error', 'Failed to add CRM client', error)
      return null
    }
    const client = toClient(inserted as unknown as ClientRow)
    set((s) => ({ clients: [...s.clients, client].sort((a, b) => a.name.localeCompare(b.name)) }))
    return client
  },

  updateClient: async (id, data) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) patch.name = data.name
    if (data.contactPerson !== undefined) patch.contact_person = data.contactPerson
    if (data.phone !== undefined) patch.phone = data.phone
    if (data.email !== undefined) patch.email = data.email
    if (data.address !== undefined) patch.address = data.address
    if (data.city !== undefined) patch.city = data.city
    if (data.notes !== undefined) patch.notes = data.notes || null

    const { error } = await supabase.from('crm_clients').update(patch).eq('id', id)
    if (error) {
      log('error', 'Failed to update CRM client', error)
      return
    }
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)),
    }))
  },

  deleteClient: async (id) => {
    const { error } = await supabase.from('crm_clients').delete().eq('id', id)
    if (error) {
      log('error', 'Failed to delete CRM client', error)
      return
    }
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
  },

  findByName: (name) => {
    const target = name.trim().toLowerCase()
    if (!target) return undefined
    return get().clients.find((c) => c.name.trim().toLowerCase() === target)
  },
}))