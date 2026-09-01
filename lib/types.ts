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
  notes?: string
  persistent?: boolean
  paused?: boolean
  completedAt?: number
  recurringRuleId?: string
  instanceDue?: number
}

export type RecurringRule = {
  id: string
  title: string
  priority: Priority
  subtasks: Subtask[]
  frequencyDays?: number
  dayOfMonth?: number
  nextDue: number
  pausedUntil?: number
  active: boolean
  createdAt: number
}

export type HistoryOutcome = "done" | "cancelled"

export type HistoryItem = Omit<Todo, "completed" | "paused" | "completedAt"> & {
  outcome: HistoryOutcome
  outcomeAt: number
  source: "todos" | "history"
}

export type Filter = "all" | "active" | "completed" | "paused"

export type Template = {
  id: string
  title: string
  priority: Priority
}

export type ShoppingItem = {
  id: string
  name: string
  quantity: number
  price: number
  checked: boolean
  createdAt: number
  order: number
}

export type GroceryFavorite = {
  id: string
  name: string
  price: number
  createdAt: number
}
