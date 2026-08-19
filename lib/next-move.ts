import type { Todo } from "@/lib/types"

export type RankedTodo = {
  todo: Todo
  score: number
  reasons: string[]
}

const DAY = 24 * 60 * 60 * 1000

function startOfDay(timestamp: number) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Turn a backlog into an explainable recommendation. The weights deliberately
 * favour deadlines first, then explicit priority, then tasks that already have
 * momentum. Age is only a gentle tie-breaker so old low-value work does not
 * permanently crowd out important work.
 */
export function rankNextMoves(todos: Todo[], now = Date.now()): RankedTodo[] {
  const today = startOfDay(now)

  return todos
    .filter((todo) => !todo.completed && !todo.paused)
    .map((todo) => {
      let score = 0
      const reasons: string[] = []

      if (todo.dueDate) {
        const daysAway = Math.round((startOfDay(todo.dueDate) - today) / DAY)

        if (daysAway < 0) {
          score += 72 + Math.min(Math.abs(daysAway), 10)
          reasons.push(`${Math.abs(daysAway)}d overdue`)
        } else if (daysAway === 0) {
          score += 64
          reasons.push("Due today")
        } else if (daysAway === 1) {
          score += 44
          reasons.push("Due tomorrow")
        } else if (daysAway <= 7) {
          score += 34 - daysAway * 2
          reasons.push(`Due in ${daysAway} days`)
        }
      }

      if (todo.priority === "high") {
        score += 32
        reasons.push("High priority")
      } else if (todo.priority === "medium") {
        score += 16
        reasons.push("Medium priority")
      } else {
        score += 5
      }

      const completedSteps = todo.subtasks.filter((subtask) => subtask.completed).length
      if (completedSteps > 0 && completedSteps < todo.subtasks.length) {
        score += 10 + (completedSteps / todo.subtasks.length) * 10
        reasons.push(`${completedSteps}/${todo.subtasks.length} steps done`)
      }

      if (todo.persistent) {
        score += 6
        reasons.push("Recurring anchor")
      }

      const ageInDays = Math.max(0, Math.floor((now - todo.createdAt) / DAY))
      score += Math.min(ageInDays, 10)
      if (reasons.length === 0 && ageInDays >= 3) reasons.push(`Waiting ${ageInDays} days`)
      if (reasons.length === 0) reasons.push("Ready to start")

      return { todo, score, reasons: reasons.slice(0, 3) }
    })
    .sort((a, b) => b.score - a.score || a.todo.order - b.todo.order)
}
