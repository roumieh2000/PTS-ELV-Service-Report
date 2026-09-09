import { create } from 'zustand'
import type { ProjectCode } from '@/types/project'
import { formatProjectCode } from '@/types/project'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'

interface ProjectStore {
  projects: ProjectCode[]
  loading: boolean
  loadProjects: () => Promise<void>
  addProject: (data: { city: string; number: string; clientRef: string }) => Promise<ProjectCode | null>
  updateProject: (id: string, data: { city: string; number: string; clientRef: string }) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getProjectByCode: (code: string) => ProjectCode | undefined
}

interface ProjectRow {
  id: string
  city: string
  number: string
  client_ref: string
  code: string
  created_at: string
  updated_at: string
}

function toProject(row: ProjectRow): ProjectCode {
  return {
    id: row.id,
    city: row.city,
    number: row.number,
    clientRef: row.client_ref,
    code: row.code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  loading: false,

  loadProjects: async () => {
    set({ loading: true })
    const { data, error } = await supabase.from('projects').select('*').order('code')
    set({ loading: false })
    if (error) {
      log('error', 'Failed to load projects', error)
      return
    }
    set({ projects: (data ?? ([] as ProjectRow[])).map(toProject) })
  },

  addProject: async (data) => {
    const now = new Date().toISOString()
    const row = {
      city: data.city,
      number: data.number.trim(),
      client_ref: data.clientRef.trim(),
      code: formatProjectCode(data.city, data.number, data.clientRef),
      created_at: now,
      updated_at: now,
    }
    const { data: inserted, error } = await supabase.from('projects').insert(row).select().single()
    if (error) {
      log('error', 'Failed to add project', error)
      return null
    }
    const project = toProject(inserted as unknown as ProjectRow)
    set((s) => ({ projects: sortedProjects([...s.projects, project]) }))
    return project
  },

  updateProject: async (id, data) => {
    const patch: Record<string, unknown> = {
      city: data.city,
      number: data.number.trim(),
      client_ref: data.clientRef.trim(),
      code: formatProjectCode(data.city, data.number, data.clientRef),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('projects').update(patch).eq('id', id)
    if (error) {
      log('error', 'Failed to update project', error)
      return
    }
    const refreshed = (await supabase.from('projects').select('*').eq('id', id).single()).data as ProjectRow
    set((s) => ({
      projects: sortedProjects(s.projects.map((p) => (p.id === id ? toProject(refreshed) : p))),
    }))
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) {
      log('error', 'Failed to delete project', error)
      return
    }
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },

  getProjectByCode: (code) => get().projects.find((p) => p.code === code),
}))

function sortedProjects(projects: ProjectCode[]): ProjectCode[] {
  return [...projects].sort((a, b) => a.code.localeCompare(b.code))
}