"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

function parseBpm(text: string): number {
  const m = text.match(/(\d{2,3})\s*bpm/i)
  if (m) return Math.min(200, Math.max(60, Number(m[1])))
  return 118
}

type Props = {
  /** Style / prompt line — scanned for "NNN BPM" */
  prompt: string
  active: boolean
  className?: string
}

/**
 * Beat-synced bar field — simulates kick/snare energy while generating (no audio yet).
 */
export function BeatReactiveVisualizer({ prompt, active, className }: Props) {
  const bpm = useMemo(() => parseBpm(prompt), [prompt])
  const [bars, setBars] = useState(() => Array.from({ length: 56 }, () => 0.12))

  useEffect(() => {
    if (!active) {
      setBars(Array.from({ length: 56 }, () => 0.08))
      return
    }
    let rafId = 0
    const n = 56
    const beatsPerSec = bpm / 60

    const tick = (tMs: number) => {
      const t = tMs / 1000
      const beat = t * beatsPerSec
      const phase = beat % 1
      const kick = Math.pow(Math.sin(phase * Math.PI), 3.2)
      const offbeat = Math.pow(Math.sin(((phase + 0.5) % 1) * Math.PI), 2.4) * 0.55
      const energy = Math.min(1, kick * 0.92 + offbeat * 0.35)

      setBars(
        Array.from({ length: n }, (_, i) => {
          const x = i / (n - 1)
          const wobble = 0.5 + 0.5 * Math.sin(i * 0.38 + t * 5.1)
          const spread = 0.35 + 0.65 * Math.sin(i * 0.11 + t * 2.8)
          const h = 0.08 + energy * (0.22 + 0.7 * wobble * spread) * (0.55 + 0.45 * x)
          return Math.min(1, h)
        }),
      )
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [active, bpm])

  return (
    <div
      className={cn(
        "flex h-36 w-full items-end justify-center gap-px sm:gap-0.5",
        className,
      )}
      role="img"
      aria-label={`Beat visualization at about ${bpm} BPM`}
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="bg-foreground w-[3px] min-w-[2px] rounded-full sm:w-1"
          style={{
            height: `${Math.round(h * 100)}%`,
            opacity: 0.35 + h * 0.65,
          }}
        />
      ))}
    </div>
  )
}
