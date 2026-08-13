export type Priority = "low" | "medium" | "high"

export type Todo = {
  id: string
  title: string
  completed: boolean
  priority: Priority
  createdAt: number
  dueDate?: number
  order: number
}

export type Filter = "all" | "active" | "completed"
