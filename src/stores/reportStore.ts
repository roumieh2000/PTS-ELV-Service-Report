import { create } from 'zustand'
import type { ServiceReport, ResolutionStatus } from '@/types/report'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface ReportStore {
  reports: ServiceReport[]
  statusFilter: ResolutionStatus | 'All'
  searchQuery: string
  loading: boolean
  setStatusFilter: (status: ResolutionStatus | 'All') => void
  setSearchQuery: (q: string) => void
  loadReports: () => Promise<void>
  addReport: (data: Omit<ServiceReport, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ServiceReport | null>
  updateReport: (id: string, data: Partial<ServiceReport>) => Promise<void>
  deleteReport: (id: string) => Promise<void>
  getReport: (id: string) => ServiceReport | undefined
}

interface ReportRow {
  id: string
  doc_ref: string
  lpo_contract_ref: string
  date: string
  txn: string
  client_name: string
  project_name: string
  job_types: string[]
  complaints: string
  actions_taken: string
  resolution_status: string
  prog_tech_name: string
  prog_tech_date: string
  prog_tech_signature: string | null
  client_sign_name: string
  client_sign_date: string
  client_signature: string | null
  documents: ServiceReport['documents']
  created_at: string
  updated_at: string
}

function toReport(row: ReportRow): ServiceReport {
  return {
    id: row.id,
    docRef: row.doc_ref,
    lpoContractRef: row.lpo_contract_ref,
    date: row.date,
    txn: row.txn,
    clientName: row.client_name,
    projectName: row.project_name,
    jobTypes: row.job_types as ServiceReport['jobTypes'],
    complaints: row.complaints,
    actionsTaken: row.actions_taken,
    resolutionStatus: row.resolution_status as ServiceReport['resolutionStatus'],
    progTechName: row.prog_tech_name,
    progTechDate: row.prog_tech_date,
    progTechSignature: row.prog_tech_signature ?? undefined,
    clientSignName: row.client_sign_name,
    clientSignDate: row.client_sign_date,
    clientSignature: row.client_signature ?? undefined,
    documents: row.documents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const useReportStore = create<ReportStore>((set, get) => ({  reports: [],
  statusFilter: 'All',
  searchQuery: '',
  loading: false,

  setStatusFilter: (status) => set({ statusFilter: status }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  loadReports: async () => {
    set({ loading: true })
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    set({ loading: false })
    if (error) {
      log('error', 'Failed to load reports', error)
      return
    }
    set({ reports: (data ?? ([] as ReportRow[])).map(toReport) })
  },

  addReport: async (data) => {
    const now = new Date().toISOString()
    const row = {
      doc_ref: data.docRef,
      lpo_contract_ref: data.lpoContractRef,
      date: data.date,
      txn: data.txn,
      client_name: data.clientName,
      project_name: data.projectName,
      job_types: data.jobTypes,
      complaints: data.complaints,
      actions_taken: data.actionsTaken,
      resolution_status: data.resolutionStatus,
      prog_tech_name: data.progTechName,
      prog_tech_date: data.progTechDate,
      prog_tech_signature: data.progTechSignature ?? null,
      client_sign_name: data.clientSignName,
      client_sign_date: data.clientSignDate,
      client_signature: data.clientSignature ?? null,
      documents: data.documents,
      created_at: now,
      updated_at: now,
    }
    const { data: inserted, error } = await supabase.from('reports').insert(row).select().single()
    if (error) {
      log('error', 'Failed to add report', error)
      return null
    }
    const report = toReport(inserted as unknown as ReportRow)
    set((s) => ({ reports: [report, ...s.reports] }))
    return report
  },

  updateReport: async (id, data) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.docRef !== undefined) patch.doc_ref = data.docRef
    if (data.lpoContractRef !== undefined) patch.lpo_contract_ref = data.lpoContractRef
    if (data.date !== undefined) patch.date = data.date
    if (data.txn !== undefined) patch.txn = data.txn
    if (data.clientName !== undefined) patch.client_name = data.clientName
    if (data.projectName !== undefined) patch.project_name = data.projectName
    if (data.jobTypes !== undefined) patch.job_types = data.jobTypes
    if (data.complaints !== undefined) patch.complaints = data.complaints
    if (data.actionsTaken !== undefined) patch.actions_taken = data.actionsTaken
    if (data.resolutionStatus !== undefined) patch.resolution_status = data.resolutionStatus
    if (data.progTechName !== undefined) patch.prog_tech_name = data.progTechName
    if (data.progTechDate !== undefined) patch.prog_tech_date = data.progTechDate
    if (data.progTechSignature !== undefined) patch.prog_tech_signature = data.progTechSignature ?? null
    if (data.clientSignName !== undefined) patch.client_sign_name = data.clientSignName
    if (data.clientSignDate !== undefined) patch.client_sign_date = data.clientSignDate
    if (data.clientSignature !== undefined) patch.client_signature = data.clientSignature ?? null
    if (data.documents !== undefined) patch.documents = data.documents

    const { error } = await supabase.from('reports').update(patch).eq('id', id)
    if (error) {
      log('error', 'Failed to update report', error)
      return
    }
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
      ),
    }))
  },

  deleteReport: async (id) => {
    const { error } = await supabase.from('reports').delete().eq('id', id)
    if (error) {
      log('error', 'Failed to delete report', error)
      return
    }
    set((s) => ({ reports: s.reports.filter((r) => r.id !== id) }))
  },

  getReport: (id) => get().reports.find((r) => r.id === id),
}))
