import { create } from 'zustand'
import type { Visit } from '@/types/visit'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface VisitStore {
  visits: Visit[]
  loading: boolean
  loadVisits: () => Promise<void>
  addVisit: (data: Omit<Visit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Visit | null>
  updateVisit: (id: string, data: Partial<Visit>) => Promise<void>
  deleteVisit: (id: string) => Promise<void>
}

interface VisitRow {
  id: string
  visit_date: string
  visit_time: string
  client_name: string
  person_in_charge: string
  project_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function toVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    date: row.visit_date,
    time: row.visit_time,
    clientName: row.client_name,
    personInCharge: row.person_in_charge,
    projectCode: row.project_code ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const useVisitStore = create<VisitStore>((set) => ({
  visits: [],
  loading: false,

  loadVisits: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .order('visit_date', { ascending: true })
      .order('visit_time', { ascending: true })
    set({ loading: false })
    if (error) {
      log('error', 'Failed to load visits', error)
      return
    }
    set({ visits: (data ?? ([] as VisitRow[])).map(toVisit) })
  },

  addVisit: async (data) => {
    const now = new Date().toISOString()
    const row = {
      visit_date: data.date,
      visit_time: data.time,
      client_name: data.clientName,
      person_in_charge: data.personInCharge,
      project_code: data.projectCode ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    }
    const { data: inserted, error } = await supabase.from('visits').insert(row).select().single()
    if (error) {
      log('error', 'Failed to add visit', error)
      return null
    }
    const visit = toVisit(inserted as unknown as VisitRow)
    set((s) => ({ visits: sortedVisits([...s.visits, visit]) }))
    return visit
  },

  updateVisit: async (id, data) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.date !== undefined) patch.visit_date = data.date
    if (data.time !== undefined) patch.visit_time = data.time
    if (data.clientName !== undefined) patch.client_name = data.clientName
    if (data.personInCharge !== undefined) patch.person_in_charge = data.personInCharge
    if (data.projectCode !== undefined) patch.project_code = data.projectCode || null
    if (data.notes !== undefined) patch.notes = data.notes || null

    const { error } = await supabase.from('visits').update(patch).eq('id', id)
    if (error) {
      log('error', 'Failed to update visit', error)
      return
    }
    set((s) => ({
      visits: sortedVisits(s.visits.map((v) => (v.id === id ? { ...v, ...data } : v))),
    }))
  },

  deleteVisit: async (id) => {
    const { error } = await supabase.from('visits').delete().eq('id', id)
    if (error) {
      log('error', 'Failed to delete visit', error)
      return
    }
    set((s) => ({ visits: s.visits.filter((v) => v.id !== id) }))
  },
}))

function sortedVisits(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  )
}