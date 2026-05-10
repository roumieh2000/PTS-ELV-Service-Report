import { create } from 'zustand'
import type { ServiceReport, ResolutionStatus } from '@/types/report'
import { initDB, saveReports, generateId } from '@/lib/db'

interface ReportStore {
  reports: ServiceReport[]
  statusFilter: ResolutionStatus | 'All'
  searchQuery: string
  setStatusFilter: (status: ResolutionStatus | 'All') => void
  setSearchQuery: (q: string) => void
  addReport: (data: Omit<ServiceReport, 'id' | 'createdAt' | 'updatedAt'>) => ServiceReport
  updateReport: (id: string, data: Partial<ServiceReport>) => void
  deleteReport: (id: string) => void
  getReport: (id: string) => ServiceReport | undefined
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: initDB(),
  statusFilter: 'All',
  searchQuery: '',

  setStatusFilter: (status) => set({ statusFilter: status }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  addReport: (data) => {
    const now = new Date().toISOString()
    const report: ServiceReport = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    set((s) => {
      const updated = [...s.reports, report]
      saveReports(updated)
      return { reports: updated }
    })
    return report
  },

  updateReport: (id, data) =>
    set((s) => {
      const updated = s.reports.map((r) =>
        r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
      )
      saveReports(updated)
      return { reports: updated }
    }),

  deleteReport: (id) =>
    set((s) => {
      const updated = s.reports.filter((r) => r.id !== id)
      saveReports(updated)
      return { reports: updated }
    }),

  getReport: (id) => get().reports.find((r) => r.id === id),
}))
