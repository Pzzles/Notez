"use client"

import { List, Loader2, Plus, Star, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { GroceryFavorite } from "@/lib/types"

type ExtractedItem = {
  name: string
  quantity: number
  price: number
  fromFavorite: boolean
  selected: boolean
}

type Props = {
  onAddItems: (items: { name: string; quantity: number; price: number }[]) => void
  favorites: GroceryFavorite[]
}

async function parseShoppingText(text: string): Promise<{ name: string; quantity: number; price: number }[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const prompt = `Extract shopping items from this message. For each item return:
- "name": clean item name (e.g. "bread", "full cream milk", "washing powder")
- "quantity": numeric quantity (1 if not mentioned)
- "price": numeric price in rands (0 if not mentioned)

Return ONLY a valid JSON array with no other text. Example: [{"name":"bread","quantity":2,"price":0}]

Message:
${text}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`)
  }

  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]"
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(cleaned)
}

export function ShoppingListParser({ onAddItems, favorites }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    setError("")
    setItems([])
    try {
      const extracted = await parseShoppingText(text)
      setItems(
        extracted.map((item) => {
          const fav = favorites.find((f) => f.name.toLowerCase() === item.name.toLowerCase())
          return {
            ...item,
            price: fav ? fav.price : item.price,
            fromFavorite: !!fav,
            selected: true,
          }
        }),
      )
      if (extracted.length === 0) setError("No items found in this message.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    const selected = items.filter((i) => i.selected)
    if (selected.length === 0) return
    onAddItems(selected.map(({ name, quantity, price }) => ({ name, quantity, price })))
    handleClose()
  }

  function handleClose() {
    setOpen(false)
    setText("")
    setItems([])
    setError("")
    setLoading(false)
  }

  const selectedCount = items.filter((i) => i.selected).length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Import from a shopping message"
        aria-label="Import from shopping list message"
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <List className="size-3.5" />
        From message
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Import shopping list</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Paste a message — items will be extracted automatically
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setItems([]); setError("") }}
              placeholder="e.g. Get 2 loaves of bread, milk, 3kg apples, washing powder, eggs x12…"
              rows={6}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />

            {items.length === 0 && (
              <button
                type="button"
                onClick={handleParse}
                disabled={!text.trim() || loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" />Extracting items…</>
                ) : (
                  <><List className="size-4" />Extract items</>
                )}
              </button>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            {items.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""} found — fill in any missing prices
                </p>

                <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                  {items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((t, j) => (j === i ? { ...t, selected: e.target.checked } : t)),
                          )
                        }
                        className="size-4 accent-primary"
                      />
                      <span className={cn("flex-1 text-sm", !item.selected && "text-muted-foreground line-through")}>
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                      <div className="flex items-center gap-1">
                        {item.fromFavorite && (
                          <span title="Price from favourites">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">R</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={item.price || ""}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((t, j) =>
                                j === i ? { ...t, price: parseFloat(e.target.value) || 0, fromFavorite: false } : t,
                              ),
                            )
                          }
                          className="w-20 rounded-lg border border-border bg-muted px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.map((t) => ({ ...t, selected: true })))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.map((t) => ({ ...t, selected: false })))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    None
                  </button>

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={selectedCount === 0}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                    Add {selectedCount} item{selectedCount !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
