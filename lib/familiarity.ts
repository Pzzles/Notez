const STORAGE_KEY = "todo_familiarity_v1"
const STOP_WORDS = new Set([
  "to", "the", "a", "an", "for", "and", "or", "with", "in", "on", "at", "of",
  "is", "are", "be", "was", "were", "do", "did", "have", "has", "my", "it",
])
const SIMILARITY_THRESHOLD = 0.35
const MIN_COMMON_WORDS = 2

export type FamiliarPattern = {
  title: string
  subtasks: string[]
  usedCount: number
  lastUsed: number
}

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w)),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const intersection = [...a].filter((w) => b.has(w)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

export function loadPatterns(): FamiliarPattern[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function savePattern(title: string, subtasks: string[]): void {
  if (typeof window === "undefined") return
  const cleaned = subtasks.map((s) => s.trim()).filter(Boolean)
  if (!cleaned.length) return

  const patterns = loadPatterns()
  const tokens = tokenize(title)

  const existing = patterns.find((p) => jaccardSimilarity(tokens, tokenize(p.title)) >= 0.8)
  if (existing) {
    existing.subtasks = [...new Set([...existing.subtasks, ...cleaned])]
    existing.usedCount += 1
    existing.lastUsed = Date.now()
  } else {
    patterns.push({ title, subtasks: cleaned, usedCount: 1, lastUsed: Date.now() })
  }

  patterns.sort((a, b) => b.lastUsed - a.lastUsed)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns.slice(0, 200)))
}

export function findSuggestion(inputTitle: string): FamiliarPattern | null {
  if (typeof window === "undefined") return null
  const input = inputTitle.trim()
  if (input.length < 4) return null

  const tokens = tokenize(input)
  if (tokens.size < 2) return null

  const patterns = loadPatterns().filter((p) => p.subtasks.length > 0)
  let best: FamiliarPattern | null = null
  let bestScore = 0

  for (const pattern of patterns) {
    const patternTokens = tokenize(pattern.title)
    const sim = jaccardSimilarity(tokens, patternTokens)
    const common = [...tokens].filter((w) => patternTokens.has(w)).length
    if (sim >= SIMILARITY_THRESHOLD && common >= MIN_COMMON_WORDS && sim > bestScore) {
      best = pattern
      bestScore = sim
    }
  }

  return best
}
