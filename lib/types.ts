export type Priority = "low" | "medium" | "high"

export type Subtask = {
  id: string
  title: string
  completed: boolean
}

export type Todo = {
  id: string
  title: string
  completed: boolean
  priority: Priority
  createdAt: number
  dueDate?: number
  order: number
  subtasks: Subtask[]
  persistent?: boolean
}

export type Filter = "all" | "active" | "completed"

export type Template = {
  id: string
  title: string
  priority: Priority
}
