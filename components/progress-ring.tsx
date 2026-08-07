import { cn } from "@/lib/utils"

type ProgressRingProps = {
  completed: number
  total: number
  size?: number
  trackClassName?: string
  barClassName?: string
  labelClassName?: string
}

export function ProgressRing({
  completed,
  total,
  size = 76,
  trackClassName = "stroke-border",
  barClassName = "stroke-primary",
  labelClassName = "",
}: ProgressRingProps) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% of tasks complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-500 ease-out", barClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums leading-none",
            labelClassName,
          )}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}
