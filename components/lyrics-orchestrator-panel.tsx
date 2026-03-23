"use client"

import { ChevronLeft, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
type Props = {
  /** Slide-in complete (double rAF from parent). */
  entered: boolean
  /** When true, panel is off-canvas but streaming continues. */
  collapsed: boolean
  onCollapse: () => void
  /** Live streamed text preview */
  streamPreview: string
  onStop: () => void
  className?: string
}

/**
 * Left side card: animated orchestrator composing while lyrics SSE streams.
 */
export function LyricsOrchestratorPanel({
  entered,
  collapsed,
  onCollapse,
  streamPreview,
  onStop,
  className,
}: Props) {
  const panelOpen = entered && !collapsed

  return (
    <aside
      aria-label="Lyrics orchestrator"
      aria-hidden={!panelOpen}
      className={cn(
        "border-border bg-background/98 skytells-card contain-layout fixed top-[7.5rem] left-[-0.3rem] z-[38] flex max-h-[calc(100dvh-7.5rem)] w-full max-w-[380px] flex-col shadow-2xl transition-transform duration-300 ease-out lg:top-16 lg:max-h-[calc(100dvh-4rem)]",
        panelOpen ? "translate-x-0" : "-translate-x-full",
        className,
      )}
    >
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-3 sm:px-4">
        <span className="text-muted-foreground min-w-0 truncate font-mono text-[10px] font-medium uppercase tracking-[0.14em]">
          Orchestrator
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8 rounded-full"
            onClick={onCollapse}
            aria-label="Hide lyrics panel"
          >
            <ChevronLeft className="size-4" />
          </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="skytells-btn-outline h-8 gap-1.5 rounded-full border-red-500/35 px-3 text-[11px] text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          onClick={onStop}
        >
          <Square className="size-3 fill-current" />
          Stop
        </Button>
        </div>
      </div>

      <div className="border-border border-b px-5 py-4">
        <div className="orchestrator-stage contain-strict relative mx-auto flex h-28 w-full max-w-[240px] items-end justify-center">
          <svg
            viewBox="0 0 200 120"
            className="text-foreground h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <ellipse cx="100" cy="108" rx="72" ry="8" className="stroke-foreground/15" strokeWidth="1" />
            <rect x="78" y="72" width="44" height="32" rx="2" className="fill-foreground/6 stroke-foreground/15" strokeWidth="1" />
            <path
              d="M100 72 L100 38 C100 28 92 22 82 24 C72 26 68 36 72 44 L78 52"
              className="stroke-foreground/50"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M100 72 L100 38 C100 28 108 22 118 24 C128 26 132 36 128 44 L122 52"
              className="stroke-foreground/50"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="100" cy="22" r="10" className="stroke-foreground/60" strokeWidth="2" />
            <g className="orchestrator-baton">
              <line x1="100" y1="40" x2="138" y2="8" className="stroke-foreground/80" strokeWidth="2" strokeLinecap="round" />
              <circle cx="140" cy="6" r="3" className="fill-foreground" />
            </g>
            <g className="orchestrator-notes">
              <path d="M42 88 Q38 72 46 60" className="stroke-foreground/30" strokeWidth="1.5" />
              <circle cx="46" cy="58" r="3" className="fill-foreground/40" />
              <path d="M158 90 Q162 74 154 62" className="stroke-foreground/30" strokeWidth="1.5" />
              <circle cx="154" cy="60" r="3" className="fill-foreground/40" />
            </g>
          </svg>
        </div>
        <p className="text-foreground mt-2 text-center text-sm font-medium tracking-tight">Composing your song…</p>
        <p className="text-muted-foreground mt-1 text-center text-[11px]">Streaming from deepbrain-router — you can stop anytime.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-[0.12em]">Live draft</p>
        <div className="border-border skytells-input max-h-[min(36vh,240px)] overflow-y-auto overscroll-contain rounded-md border">
          <pre className="text-foreground font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap p-3">
            {streamPreview || "…"}
          </pre>
        </div>
      </div>
    </aside>
  )
}
