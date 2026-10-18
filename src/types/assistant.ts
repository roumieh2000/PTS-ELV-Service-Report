export interface PlanNode {
  label: string
  hours?: number
  children?: PlanNode[]
}

export interface Plan {
  id: string
  title: string
  root: PlanNode
  createdBy: string
  createdAt: string
}

export interface ChatArtifact {
  type: 'quote' | 'plan'
  id: string
  label: string
  path: string
  detail?: string
}

export interface UsedTool {
  name: string
  summary: string
}

export interface AgentReply {
  reply: string
  artifacts: ChatArtifact[]
  toolsUsed: UsedTool[]
}

export interface DigestItem {
  id: string
  client: string
  task: string
  dueDate: string
  assignedTo: string
  status: string
}

export interface Digest {
  date: string
  counts: { overdue: number; dueToday: number; upcoming: number }
  overdue: DigestItem[]
  dueToday: DigestItem[]
  upcoming: DigestItem[]
}
