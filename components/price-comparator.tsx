"use client"

import { Plus, RotateCcw, Scale, Trash2, Trophy } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type ComparisonKind = "weight" | "volume" | "quantity"
type Unit = "g" | "kg" | "ml" | "l" | "item"

type Offer = {
  id: number
  name: string
  price: string
  amount: string
  unit: Unit
}

type UnitDefinition = {
  label: string
  baseMultiplier: number
}

const UNIT_OPTIONS: Record<ComparisonKind, Unit[]> = {
  weight: ["g", "kg"],
  volume: ["ml", "l"],
  quantity: ["item"],
}

const UNIT_DEFINITIONS: Record<Unit, UnitDefinition> = {
  g: { label: "g", baseMultiplier: 1 },
  kg: { label: "kg", baseMultiplier: 1_000 },
  ml: { label: "ml", baseMultiplier: 1 },
  l: { label: "L", baseMultiplier: 1_000 },
  item: { label: "items", baseMultiplier: 1 },
}

const DEFAULT_UNITS: Record<ComparisonKind, Unit> = {
  weight: "g",
  volume: "ml",
  quantity: "item",
}

const KIND_LABELS: Record<ComparisonKind, string> = {
  weight: "Weight",
  volume: "Volume",
  quantity: "Quantity",
}

function formatRand(value: number) {
  return `R${value.toFixed(2)}`
}

function makeOffer(id: number, unit: Unit): Offer {
  return { id, name: "", price: "", amount: "", unit }
}

function comparisonRate(offer: Offer, kind: ComparisonKind) {
  const price = Number(offer.price)
  const amount = Number(offer.amount)
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(amount) || amount <= 0) return null

  const pricePerBaseUnit = price / (amount * UNIT_DEFINITIONS[offer.unit].baseMultiplier)
  if (kind === "weight" || kind === "volume") return pricePerBaseUnit * 1_000
  return pricePerBaseUnit
}

function rateSuffix(kind: ComparisonKind) {
  if (kind === "weight") return "per kg"
  if (kind === "volume") return "per litre"
  return "per item"
}

export function PriceComparator() {
  const [kind, setKind] = useState<ComparisonKind>("weight")
  const [nextId, setNextId] = useState(3)
  const [offers, setOffers] = useState<Offer[]>([
    makeOffer(1, DEFAULT_UNITS.weight),
    makeOffer(2, DEFAULT_UNITS.weight),
  ])

  const results = useMemo(
    () => offers.map((offer) => ({ offer, rate: comparisonRate(offer, kind) })),
    [kind, offers],
  )
  const completedResults = results.filter((result): result is typeof result & { rate: number } => result.rate !== null)
  const rankedResults = [...completedResults].sort((a, b) => a.rate - b.rate)
  const best = rankedResults[0]
  const runnerUp = rankedResults[1]
  const savingsPercent = best && runnerUp && runnerUp.rate > 0
    ? Math.max(0, (1 - best.rate / runnerUp.rate) * 100)
    : 0

  function updateOffer(id: number, patch: Partial<Offer>) {
    setOffers((current) => current.map((offer) => offer.id === id ? { ...offer, ...patch } : offer))
  }

  function changeKind(nextKind: ComparisonKind) {
    setKind(nextKind)
    setOffers((current) => current.map((offer) => ({ ...offer, unit: DEFAULT_UNITS[nextKind] })))
  }

  function addOffer() {
    setOffers((current) => [...current, makeOffer(nextId, DEFAULT_UNITS[kind])])
    setNextId((current) => current + 1)
  }

  function reset() {
    setOffers([
      makeOffer(nextId, DEFAULT_UNITS[kind]),
      makeOffer(nextId + 1, DEFAULT_UNITS[kind]),
    ])
    setNextId((current) => current + 2)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="size-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Compare unit prices</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Enter the shelf price and pack size for each option. We&apos;ll normalize the units and find the best value.
            </p>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Compare by
          </legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {(Object.keys(KIND_LABELS) as ComparisonKind[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeKind(option)}
                aria-pressed={kind === option}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                  kind === option
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {KIND_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-2">
        {results.map(({ offer, rate }, index) => {
          const isBest = completedResults.length > 1 && offer.id === best?.offer.id
          return (
            <section
              key={offer.id}
              className={cn(
                "rounded-2xl border p-3 transition-colors",
                isBest ? "border-green-500/40 bg-green-500/8" : "border-border bg-background",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={cn(
                  "flex size-6 items-center justify-center rounded-lg text-[11px] font-bold",
                  isBest ? "bg-green-500 text-white" : "bg-muted text-muted-foreground",
                )}>
                  {String.fromCharCode(65 + index)}
                </span>
                <input
                  type="text"
                  value={offer.name}
                  onChange={(event) => updateOffer(offer.id, { name: event.target.value })}
                  placeholder={`Option ${String.fromCharCode(65 + index)} name (optional)`}
                  aria-label={`Option ${index + 1} name`}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
                {isBest && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-1 text-[10px] font-semibold text-green-700 dark:text-green-400">
                    <Trophy className="size-3" /> Best value
                  </span>
                )}
                {offers.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOffers((current) => current.filter((item) => item.id !== offer.id))}
                    aria-label={`Remove option ${index + 1}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <label className="flex min-w-0 items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring/50">
                  <span className="pl-3 text-xs text-muted-foreground">R</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={offer.price}
                    onChange={(event) => updateOffer(offer.id, { price: event.target.value })}
                    placeholder="Price"
                    aria-label={`Option ${index + 1} price in rand`}
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </label>

                <label className="flex min-w-0 items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring/50">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="any"
                    value={offer.amount}
                    onChange={(event) => updateOffer(offer.id, { amount: event.target.value })}
                    placeholder={kind === "quantity" ? "Count" : "Size"}
                    aria-label={`Option ${index + 1} ${kind === "quantity" ? "count" : "pack size"}`}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                  />
                  {kind === "quantity" ? (
                    <span className="pr-3 text-xs text-muted-foreground">items</span>
                  ) : (
                    <select
                      value={offer.unit}
                      onChange={(event) => updateOffer(offer.id, { unit: event.target.value as Unit })}
                      aria-label={`Option ${index + 1} unit`}
                      className="mr-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium outline-none"
                    >
                      {UNIT_OPTIONS[kind].map((unit) => (
                        <option key={unit} value={unit}>{UNIT_DEFINITIONS[unit].label}</option>
                      ))}
                    </select>
                  )}
                </label>

                <div className={cn(
                  "col-span-2 flex min-h-10 items-center justify-end rounded-xl px-3 sm:col-span-1 sm:min-w-40",
                  rate !== null ? "bg-muted/60" : "border border-dashed border-border",
                )}>
                  {rate !== null ? (
                    <p className="text-right text-sm font-semibold tabular-nums">
                      {formatRand(rate)} <span className="text-[11px] font-normal text-muted-foreground">{rateSuffix(kind)}</span>
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unit price</span>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {best && runnerUp ? (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                {best.offer.name.trim() || `Option ${String.fromCharCode(65 + offers.indexOf(best.offer))}`} is the best value
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatRand(best.rate)} {rateSuffix(kind)}
                {savingsPercent > 0 && ` · ${savingsPercent.toFixed(1)}% less than the next-cheapest option`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-center text-xs text-muted-foreground">
          Complete at least two options to see which is the better deal.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={addOffer}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Plus className="size-3.5" /> Add option
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset
        </button>
      </div>
    </div>
  )
}
