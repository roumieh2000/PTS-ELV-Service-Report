import { create } from 'zustand'
import type { CrmFollowUp, FollowUpStatus } from '@/types/crm'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface CrmFollowUpStore {
  followups: CrmFollowUp[]
  loading: boolean
  loadFollowups: () => Promise<void>
  addFollowUp: (data: Omit<CrmFollowUp, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CrmFollowUp | null>
  updateFollowUp: (id: string, data: Partial<CrmFollowUp>) => Promise<void>
  deleteFollowUp: (id: string) => Promise<void>
}

interface FollowUpRow {
  id: string
  client_id: string
  report_id: string | null
  visit_id: string | null
  assigned_to: string
  task: string
  due_date: string
  status: string
  created_at: string
  updated_at: string
}

function toFollowUp(row: FollowUpRow): CrmFollowUp {
  return {
    id: row.id,
    clientId: row.client_id,
    reportId: row.report_id ?? undefined,
    visitId: row.visit_id ?? undefined,
    assignedTo: row.assigned_to,
    task: row.task,
    dueDate: row.due_date,
    status: row.status as FollowUpStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const useCrmFollowUpStore = create<CrmFollowUpStore>((set) => ({
  followups: [],
  loading: false,

  loadFollowups: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('crm_followups')
      .select('*')
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
    set({ loading: false })
    if (error) {
      log('error', 'Failed to load CRM follow-ups', error)
      return
    }
    set({ followups: (data ?? ([] as FollowUpRow[])).map(toFollowUp) })
  },

  addFollowUp: async (data) => {
    const now = new Date().toISOString()
    const row = {
      client_id: data.clientId,
      report_id: data.reportId ?? null,
      visit_id: data.visitId ?? null,
      assigned_to: data.assignedTo,
      task: data.task,
      due_date: data.dueDate,
      status: data.status,
      created_at: now,
      updated_at: now,
    }
    const { data: inserted, error } = await supabase.from('crm_followups').insert(row).select().single()
    if (error) {
      log('error', 'Failed to add follow-up', error)
      return null
    }
    const followUp = toFollowUp(inserted as unknown as FollowUpRow)
    set((s) => ({ followups: [...s.followups, followUp] }))
    return followUp
  },

  updateFollowUp: async (id, data) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.clientId !== undefined) patch.client_id = data.clientId
    if (data.reportId !== undefined) patch.report_id = data.reportId || null
    if (data.visitId !== undefined) patch.visit_id = data.visitId || null
    if (data.assignedTo !== undefined) patch.assigned_to = data.assignedTo
    if (data.task !== undefined) patch.task = data.task
    if (data.dueDate !== undefined) patch.due_date = data.dueDate
    if (data.status !== undefined) patch.status = data.status

    const { error } = await supabase.from('crm_followups').update(patch).eq('id', id)
    if (error) {
      log('error', 'Failed to update follow-up', error)
      return
    }
    set((s) => ({
      followups: s.followups.map((f) => (f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f)),
    }))
  },

  deleteFollowUp: async (id) => {
    const { error } = await supabase.from('crm_followups').delete().eq('id', id)
    if (error) {
      log('error', 'Failed to delete follow-up', error)
      return
    }
    set((s) => ({ followups: s.followups.filter((f) => f.id !== id) }))
  },
}))