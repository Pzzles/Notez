"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Plus, Scale, ShoppingCart, Star, Trash2, X } from "lucide-react"
import { useRef, useState } from "react"
import { PriceComparator } from "@/components/price-comparator"
import { ShoppingListParser } from "@/components/shopping-list-parser"
import { useToast } from "@/components/toast"
import { useGroceryFavorites } from "@/hooks/use-grocery-favorites"
import { useShopping } from "@/hooks/use-shopping"
import type { GroceryFavorite } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ShoppingList() {
  const { items, hydrated, addItem, toggleItem, removeItem, clearAll } = useShopping()
  const { favorites, saveFavorite, updateFavoritePrice, removeFavorite } = useGroceryFavorites()
  const toast = useToast()
  const [view, setView] = useState<"list" | "favourites" | "compare">("list")
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState("")

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseFloat(quantity)
    const pr = parseFloat(price)
    if (!name.trim() || isNaN(qty) || qty <= 0 || isNaN(pr) || pr < 0) return
    addItem(name.trim(), qty, pr)
    setName("")
    setQuantity("1")
    setPrice("")
    toast.success("Item added")
  }

  function handleAddParsed(parsedItems: { name: string; quantity: number; price: number }[]) {
    parsedItems.forEach((item) => addItem(item.name, item.quantity, item.price))
    toast.success(`${parsedItems.length} item${parsedItems.length !== 1 ? "s" : ""} added`)
  }

  function handleToggleFavorite(itemName: string, itemPrice: number) {
    const existing = favorites.find((f) => f.name.toLowerCase() === itemName.toLowerCase())
    if (existing) {
      removeFavorite(existing.id)
      toast("Removed from favourites")
    } else {
      saveFavorite(itemName, itemPrice)
      toast.success("Saved to favourites")
    }
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const checkedTotal = items.filter((i) => i.checked).reduce((sum, item) => sum + item.quantity * item.price, 0)
  const checkedCount = items.filter((i) => i.checked).length
  const allChecked = items.length > 0 && items.every((i) => i.checked)

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-toggle */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
            view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShoppingCart className="size-3.5" />
          List
        </button>
        <button
          type="button"
          onClick={() => setView("favourites")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
            view === "favourites"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className="size-3.5" />
          Favourites
          {favorites.length > 0 && (
            <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {favorites.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setView("compare")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
            view === "compare"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Scale className="size-3.5" />
          Compare
        </button>
      </div>

      {view === "compare" ? (
        <PriceComparator />
      ) : view === "favourites" ? (
        <FavouritesList
          favorites={favorites}
          onAddToCart={(fav) => { addItem(fav.name, 1, fav.price); toast.success(`${fav.name} added`); setView("list") }}
          onUpdatePrice={updateFavoritePrice}
          onRemove={(id) => { removeFavorite(id); toast("Removed from favourites") }}
        />
      ) : (
        <>
          {/* Input form */}
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Qty"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              />
              <input
                type="number"
                placeholder="Price (R)"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              />
              <button
                type="submit"
                disabled={!name.trim() || !price}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Plus className="size-4" />
                Add
              </button>
            </div>
          </form>

          <ShoppingListParser onAddItems={handleAddParsed} favorites={favorites} />

          {!hydrated ? null : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <ShoppingCart className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">Cart is empty. Add items above.</p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const isFav = favorites.some((f) => f.name.toLowerCase() === item.name.toLowerCase())
                    return (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors",
                          item.checked && "opacity-50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          aria-label={item.checked ? "Uncheck item" : "Check off item"}
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            item.checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary",
                          )}
                        >
                          {item.checked && <Check className="size-3" />}
                        </button>

                        <span
                          className={cn(
                            "flex-1 truncate text-sm",
                            item.checked && "line-through text-muted-foreground",
                          )}
                        >
                          {item.name}
                        </span>

                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {item.quantity} × R{item.price.toFixed(2)}
                        </span>
                        <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                          R{(item.quantity * item.price).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item.name, item.price)}
                          aria-label={isFav ? "Remove from favourites" : "Save to favourites"}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-amber-500/10"
                        >
                          <Star
                            className={cn(
                              "size-3.5 transition-colors",
                              isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                            )}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>

              <div
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  allChecked ? "border-green-500/30 bg-green-500/10" : "border-border bg-muted/30",
                )}
              >
                {allChecked ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">
                      Shopping done!
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">Total spent</span>
                      <span className="ml-auto font-mono text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                        R{total.toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { clearAll(); toast("Shopping list cleared") }}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 className="size-3.5" />
                      Clear list
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {checkedCount} / {items.length} picked
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Remaining: R{(total - checkedTotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-muted-foreground">Cart total</span>
                      <span className="font-mono text-xl font-bold tabular-nums">R{total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {!allChecked && (
                <button
                  type="button"
                  onClick={() => { clearAll(); toast("Shopping list cleared") }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Clear list
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function FavouritesList({
  favorites,
  onAddToCart,
  onUpdatePrice,
  onRemove,
}: {
  favorites: GroceryFavorite[]
  onAddToCart: (fav: GroceryFavorite) => void
  onUpdatePrice: (id: string, price: number) => void
  onRemove: (id: string) => void
}) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
        <Star className="size-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">No favourites yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Star an item in your list to save it here with its price.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {favorites.map((fav) => (
        <li
          key={fav.id}
          className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
        >
          <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />

          <span className="flex-1 truncate text-sm">{fav.name}</span>

          <PriceEdit
            price={fav.price}
            onSave={(p) => onUpdatePrice(fav.id, p)}
          />

          <button
            type="button"
            onClick={() => onAddToCart(fav)}
            aria-label={`Add ${fav.name} to list`}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onRemove(fav.id)}
            aria-label={`Remove ${fav.name} from favourites`}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function PriceEdit({ price, onSave }: { price: number; onSave: (p: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(price))
  const inputRef = useRef<HTMLInputElement>(null)

  function commit() {
    const p = parseFloat(val)
    if (!isNaN(p) && p >= 0) onSave(p)
    else setVal(String(price))
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">R</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="any"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(String(price)); setEditing(false) } }}
          autoFocus
          className="w-20 rounded-lg border border-ring bg-background px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setVal(String(price)); setEditing(true) }}
      title="Click to edit price"
      className="rounded-lg px-2 py-1 text-sm font-semibold tabular-nums text-foreground transition-colors hover:bg-muted"
    >
      R{price.toFixed(2)}
    </button>
  )
}
