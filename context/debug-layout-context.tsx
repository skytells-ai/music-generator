"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

const STORAGE_KEY = "beatfusion-debug-layout"

export type DebugLayoutState = {
  orchestrator: boolean
  playerDock: boolean
  generationRail: boolean
  toolsCard: boolean
}

const defaultState: DebugLayoutState = {
  orchestrator: false,
  playerDock: false,
  generationRail: false,
  toolsCard: false,
}

type DebugLayoutContextValue = {
  debug: DebugLayoutState
  setOrchestrator: (v: boolean) => void
  setPlayerDock: (v: boolean) => void
  setGenerationRail: (v: boolean) => void
  setToolsCard: (v: boolean) => void
  reset: () => void
}

const DebugLayoutContext = createContext<DebugLayoutContextValue | null>(null)

function loadStored(): DebugLayoutState {
  if (typeof window === "undefined") return defaultState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const j = JSON.parse(raw) as Partial<DebugLayoutState>
    return {
      orchestrator: Boolean(j.orchestrator),
      playerDock: Boolean(j.playerDock),
      generationRail: Boolean(j.generationRail),
      toolsCard: Boolean(j.toolsCard),
    }
  } catch {
    return defaultState
  }
}

export function DebugLayoutProvider({ children }: { children: ReactNode }) {
  const [debug, setDebug] = useState<DebugLayoutState>(defaultState)

  useEffect(() => {
    setDebug(loadStored())
  }, [])

  const persist = useCallback((next: DebugLayoutState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const patch = useCallback(
    (partial: Partial<DebugLayoutState>) => {
      setDebug((prev) => {
        const next = { ...prev, ...partial }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const value = useMemo<DebugLayoutContextValue>(
    () => ({
      debug,
      setOrchestrator: (v) => patch({ orchestrator: v }),
      setPlayerDock: (v) => patch({ playerDock: v }),
      setGenerationRail: (v) => patch({ generationRail: v }),
      setToolsCard: (v) => patch({ toolsCard: v }),
      reset: () => {
        setDebug(defaultState)
        persist(defaultState)
      },
    }),
    [debug, patch, persist],
  )

  return <DebugLayoutContext.Provider value={value}>{children}</DebugLayoutContext.Provider>
}

export function useDebugLayout(): DebugLayoutContextValue {
  const ctx = useContext(DebugLayoutContext)
  if (!ctx) {
    return {
      debug: defaultState,
      setOrchestrator: () => {},
      setPlayerDock: () => {},
      setGenerationRail: () => {},
      setToolsCard: () => {},
      reset: () => {},
    }
  }
  return ctx
}

/** Demo copy for orchestrator when only debug is on (no live SSE). */
export const DEBUG_ORCHESTRATOR_PREVIEW = `[Debug] Live draft preview
[Verse]
Neon lines and borrowed time
We paint the sky in rhythm`
