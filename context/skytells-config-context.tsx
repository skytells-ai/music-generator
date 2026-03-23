"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  DEFAULT_SKYTELLS_IMAGE_MODEL,
  DEFAULT_SKYTELLS_LYRICS_MODEL,
  SKYTELLS_HEADER_API_KEY,
  SKYTELLS_HEADER_IMAGE_MODEL,
  SKYTELLS_HEADER_LYRICS_MODEL,
} from "@/lib/skytells-runtime-config"

const STORAGE_KEY = "beatfusion-skytells-client-v1"

export type ClientSkytellsConfig = {
  apiKey?: string
  imageModel?: string
  lyricsModel?: string
}

type SkytellsConfigContextValue = {
  loaded: boolean
  hasServerApiKey: boolean
  serverDefaults: { imageModel: string; lyricsModel: string }
  client: ClientSkytellsConfig
  setClient: (next: ClientSkytellsConfig) => void
  /** True when the app can call Skytells-backed routes (server key or stored client key). */
  canUseSkytells: boolean
  /** Merge these into API `fetch` calls (Skytells routes only). */
  skytellsHeaders: Record<string, string>
  effectiveImageModel: string
  effectiveLyricsModel: string
  openSettings: () => void
  registerOpenSettings: (fn: () => void) => void
}

const SkytellsConfigContext = createContext<SkytellsConfigContextValue | null>(null)

function readStored(): ClientSkytellsConfig {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const j = JSON.parse(raw) as unknown
    if (!j || typeof j !== "object") return {}
    const o = j as Record<string, unknown>
    return {
      apiKey: typeof o.apiKey === "string" ? o.apiKey : undefined,
      imageModel: typeof o.imageModel === "string" ? o.imageModel : undefined,
      lyricsModel: typeof o.lyricsModel === "string" ? o.lyricsModel : undefined,
    }
  } catch {
    return {}
  }
}

function writeStored(c: ClientSkytellsConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {
    /* ignore quota */
  }
}

export function SkytellsConfigProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [hasServerApiKey, setHasServerApiKey] = useState(false)
  const [serverDefaults, setServerDefaults] = useState({
    imageModel: DEFAULT_SKYTELLS_IMAGE_MODEL,
    lyricsModel: DEFAULT_SKYTELLS_LYRICS_MODEL,
  })
  const [client, setClientState] = useState<ClientSkytellsConfig>(() => readStored())

  const [openSettingsFn, setOpenSettingsFn] = useState<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/skytells/config")
        const j = (await res.json()) as {
          hasServerApiKey?: boolean
          defaults?: { imageModel?: string; lyricsModel?: string }
        }
        if (cancelled) return
        setHasServerApiKey(Boolean(j.hasServerApiKey))
        if (j.defaults?.imageModel && j.defaults?.lyricsModel) {
          setServerDefaults({
            imageModel: j.defaults.imageModel,
            lyricsModel: j.defaults.lyricsModel,
          })
        }
      } catch {
        if (!cancelled) setHasServerApiKey(false)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setClient = useCallback((next: ClientSkytellsConfig) => {
    setClientState(next)
    writeStored(next)
  }, [])

  /** While server config is loading, allow attempts (e.g. server-only key). */
  const canUseSkytells =
    !loaded || Boolean(hasServerApiKey || client.apiKey?.trim())

  const effectiveImageModel =
    client.imageModel?.trim() || serverDefaults.imageModel || DEFAULT_SKYTELLS_IMAGE_MODEL
  const effectiveLyricsModel =
    client.lyricsModel?.trim() || serverDefaults.lyricsModel || DEFAULT_SKYTELLS_LYRICS_MODEL

  const skytellsHeaders = useMemo(() => {
    const h: Record<string, string> = {}
    if (!hasServerApiKey) {
      const k = client.apiKey?.trim()
      if (k) h[SKYTELLS_HEADER_API_KEY] = k
    }
    const im = client.imageModel?.trim()
    if (im) h[SKYTELLS_HEADER_IMAGE_MODEL] = im
    const lm = client.lyricsModel?.trim()
    if (lm) h[SKYTELLS_HEADER_LYRICS_MODEL] = lm
    return h
  }, [hasServerApiKey, client.apiKey, client.imageModel, client.lyricsModel])

  const openSettings = useCallback(() => {
    openSettingsFn?.()
  }, [openSettingsFn])

  const registerOpenSettings = useCallback((fn: () => void) => {
    setOpenSettingsFn(() => fn)
  }, [])

  const value = useMemo(
    () => ({
      loaded,
      hasServerApiKey,
      serverDefaults,
      client,
      setClient,
      canUseSkytells,
      skytellsHeaders,
      effectiveImageModel,
      effectiveLyricsModel,
      openSettings,
      registerOpenSettings,
    }),
    [
      loaded,
      hasServerApiKey,
      serverDefaults,
      client,
      setClient,
      canUseSkytells,
      skytellsHeaders,
      effectiveImageModel,
      effectiveLyricsModel,
      openSettings,
      registerOpenSettings,
    ],
  )

  return (
    <SkytellsConfigContext.Provider value={value}>{children}</SkytellsConfigContext.Provider>
  )
}

export function useSkytellsConfig() {
  const ctx = useContext(SkytellsConfigContext)
  if (!ctx) {
    throw new Error("useSkytellsConfig must be used within SkytellsConfigProvider")
  }
  return ctx
}
