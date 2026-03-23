"use client"

import { Bug, RotateCcw } from "lucide-react"
import { useDebugLayout } from "@/context/debug-layout-context"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function showToolbar(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_UI === "1") return true
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") return true
  return false
}

/**
 * Dev-only: toggle mock visibility for orchestrator, player dock, generation rail, tools card.
 * Renders nothing in production unless `NEXT_PUBLIC_DEBUG_UI=1`.
 */
export function DebugLayoutToolbar() {
  const { debug, setOrchestrator, setPlayerDock, setGenerationRail, setToolsCard, reset } = useDebugLayout()

  if (!showToolbar()) return null

  const active = debug.orchestrator || debug.playerDock || debug.generationRail || debug.toolsCard

  return (
    <section
      className={cn(
        "border-border bg-card/50 skytells-card mx-auto mb-8 max-w-[1248px] rounded-lg border px-5 py-4 sm:px-6 mt-8",
        active && "border-amber-500/35 bg-amber-500/6 dark:border-amber-400/30 dark:bg-amber-400/7",
      )}
      aria-label="Layout debug"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bug className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-foreground text-sm font-medium tracking-tight">Layout debug</h2>
          <span className="text-muted-foreground hidden text-[11px] sm:inline">Local preview · not wired to APIs</span>
        </div>
        <Button type="button" variant="outline" size="sm" className="skytells-btn-outline h-8 gap-1.5 text-[12px]" onClick={reset}>
          <RotateCcw className="size-3.5" />
          Reset all
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-background/40 px-3 py-2">
          <Label htmlFor="dbg-orch" className="cursor-pointer text-[13px] font-normal">
            Orchestrator
          </Label>
          <Switch id="dbg-orch" checked={debug.orchestrator} onCheckedChange={setOrchestrator} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-background/40 px-3 py-2">
          <Label htmlFor="dbg-player" className="cursor-pointer text-[13px] font-normal">
            Player + cover
          </Label>
          <Switch id="dbg-player" checked={debug.playerDock} onCheckedChange={setPlayerDock} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-background/40 px-3 py-2">
          <Label htmlFor="dbg-rail" className="cursor-pointer text-[13px] font-normal">
            Generation rail
          </Label>
          <Switch id="dbg-rail" checked={debug.generationRail} onCheckedChange={setGenerationRail} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-background/40 px-3 py-2">
          <Label htmlFor="dbg-tools" className="cursor-pointer text-[13px] font-normal">
            Tools card
          </Label>
          <Switch id="dbg-tools" checked={debug.toolsCard} onCheckedChange={setToolsCard} />
        </div>
      </div>
    </section>
  )
}
