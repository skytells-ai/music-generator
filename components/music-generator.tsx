"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ChevronDown,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Settings2,
  Sparkles,
  Square,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createDemoWavObjectUrl } from "@/lib/audio-wav"
import { BEATFUSION_MODEL, type BeatFusionGenerateBody } from "@/lib/skytells-music"
import { cn } from "@/lib/utils"
import { AudioPlayerWaveform } from "@/components/audio-player-waveform"
import { BeatReactiveVisualizer } from "@/components/beat-reactive-visualizer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LyricsInput from "@/components/ui/lyrics-input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LyricsOrchestratorPanel } from "@/components/lyrics-orchestrator-panel"
import { DEBUG_ORCHESTRATOR_PREVIEW, useDebugLayout } from "@/context/debug-layout-context"
import { useSkytellsConfig } from "@/context/skytells-config-context"

type StreamEvent =
  | { type: "init"; request: { model: string; input: Record<string, unknown> } }
  | { type: "progress"; prediction: Record<string, unknown> }
  | {
      type: "prediction_started"
      predictionId: string
      prediction: Record<string, unknown>
    }
  | {
      type: "complete"
      predictionId: string
      status: string
      audioUrl?: string
      raw?: Record<string, unknown>
      output?: unknown
      outputsNormalized?: unknown
    }
  | { type: "error"; message: string; errorId?: string; httpStatus?: number }

type PredictionPollJson = {
  predictionId?: string
  status?: string
  audioUrl?: string
  raw?: Record<string, unknown>
  error?: string
  errorId?: string
}

const DEV_KEY = "skytells-beatfusion-dev"
/** Interval between `GET /api/prediction` polls after the first fetch. */
const PREDICTION_POLL_MS = 20_000

function appendLog(prev: string[], line: string, max = 400): string[] {
  return [...prev.slice(-(max - 1)), line]
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const t = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      signal?.removeEventListener("abort", onAbort)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

function parseBpm(text: string): number | null {
  const m = text.match(/(\d{2,3})\s*bpm/i)
  if (m) return Math.min(200, Math.max(60, Number(m[1])))
  return null
}

async function consumeSse(
  body: BeatFusionGenerateBody,
  onEvent: (e: StreamEvent) => void,
  skytellsHeaders: Record<string, string>,
): Promise<void> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...skytellsHeaders },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error ?? `HTTP ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body.")
  const dec = new TextDecoder()
  let buf = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split("\n\n")
    buf = parts.pop() ?? ""
    for (const block of parts) {
      const t = block.trim()
      if (!t.startsWith("data: ")) continue
      onEvent(JSON.parse(t.slice(6)) as StreamEvent)
    }
  }
}

/** Parses SSE from `POST /api/lyrics` with `{ stream: true }`. */
async function consumeLyricsSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<void> {
  const decoder = new TextDecoder()
  let buf = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split("\n\n")
    buf = parts.pop() ?? ""
    for (const block of parts) {
      const t = block.trim()
      if (!t.startsWith("data: ")) continue
      const ev = JSON.parse(t.slice(6)) as { type: string; text?: string; message?: string }
      if (ev.type === "delta" && ev.text) onDelta(ev.text)
      if (ev.type === "error") throw new Error(ev.message ?? "Stream error")
      if (ev.type === "done") return
    }
  }
}

const STATUS_LINES = [
  "Synthesizing vocals…",
  "Layering instrumentation…",
  "Shaping dynamics…",
  "Mixing…",
  "Almost there…",
]

export function MusicGenerator() {
  const { toast } = useToast()
  const { debug, setOrchestrator } = useDebugLayout()
  const {
    skytellsHeaders,
    canUseSkytells,
    effectiveImageModel,
    effectiveLyricsModel,
    openSettings,
  } = useSkytellsConfig()

  const [lyrics, setLyrics] = useState(
    "[Verse]\nNeon rivers paint the sky\nWe drift where satellites fly\n\n[Chorus]\nTurn it up — the night is young\nBeatFusion on my tongue",
  )
  const [prompt, setPrompt] = useState("Electronic pop, euphoric, wide stereo, 118 BPM.")
  const [sampleRate, setSampleRate] = useState("44100")
  const [bitrate, setBitrate] = useState("256000")
  const [audioFormat, setAudioFormat] = useState("mp3")

  const [busy, setBusy] = useState(false)
  const [simulateGeneration, setSimulateGeneration] = useState(false)
  const skytellsGenerateBlocked = useMemo(
    () => !canUseSkytells && !simulateGeneration,
    [canUseSkytells, simulateGeneration],
  )
  const [phaseLine, setPhaseLine] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  /** Set when the latest generation finished with playable audio (used for player + cover). */
  const [audioGenerationComplete, setAudioGenerationComplete] = useState(false)
  const [lastPredictionId, setLastPredictionId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverPrompt, setCoverPrompt] = useState("")
  const [coverAspect, setCoverAspect] = useState("1:1")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [devOpen, setDevOpen] = useState(false)
  /** Tools card (BPM, copy actions) — excluded from player vertical centering. */
  const [showToolsCard, setShowToolsCard] = useState(false)
  const [reqJson, setReqJson] = useState<string | null>(null)
  const [lastEv, setLastEv] = useState<string | null>(null)
  const [completeRaw, setCompleteRaw] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const [tick, setTick] = useState(0)
  const devOpenRef = useRef(devOpen)
  devOpenRef.current = devOpen

  /** Right rail: stays mounted briefly after `busy` ends so close animation can run. */
  const [railOpen, setRailOpen] = useState(false)
  const [railEntered, setRailEntered] = useState(false)

  const [lyricsIdea, setLyricsIdea] = useState("")
  const [lyricsBusy, setLyricsBusy] = useState(false)
  const [replaceLyricsWithAi, setReplaceLyricsWithAi] = useState(true)
  /** AI lyrics tools hidden until the sparkles control in the textarea is used. */
  const [lyricsAiOpen, setLyricsAiOpen] = useState(false)

  const [lyricsStreaming, setLyricsStreaming] = useState(false)
  /** User hid the orchestrator while streaming; restore with the floating control. */
  const [lyricsPanelCollapsed, setLyricsPanelCollapsed] = useState(false)
  const [lyricsStreamBuffer, setLyricsStreamBuffer] = useState("")
  const [lyricsStreamPrefix, setLyricsStreamPrefix] = useState("")
  const [lyricsStreamEntered, setLyricsStreamEntered] = useState(false)
  const lyricsAbortRef = useRef<AbortController | null>(null)
  const generateAbortRef = useRef<AbortController | null>(null)
  const lyricsStreamBufferRef = useRef("")
  const lyricsPrefixRef = useRef("")

  /** Demo WAV for layout-debug “Player + cover” when no real audio. */
  const [debugAudioUrl, setDebugAudioUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!debug.playerDock) {
      setDebugAudioUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    if (audioUrl) {
      setDebugAudioUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    const u = createDemoWavObjectUrl()
    setDebugAudioUrl(u)
    return () => {
      URL.revokeObjectURL(u)
    }
  }, [debug.playerDock, audioUrl])

  const effectiveAudioUrl = audioUrl ?? debugAudioUrl
  const orchestratorVisible = lyricsStreaming || debug.orchestrator
  const railVisible = railOpen || debug.generationRail
  const railInView = railEntered || debug.generationRail

  const bpmHint = useMemo(() => parseBpm(prompt), [prompt])

  const showPlayer = Boolean(audioUrl && !busy && !railOpen && audioGenerationComplete)
  const showPlayerColumn =
    Boolean(effectiveAudioUrl) && ((showPlayer && Boolean(audioUrl)) || Boolean(debug.playerDock && effectiveAudioUrl))
  /** Player + cover dock visible (hidden while orchestrator has focus). */
  const playerDockVisible = showPlayerColumn && !orchestratorVisible

  const audioDownloadFilename = useMemo(() => {
    if (!effectiveAudioUrl) return undefined
    const ext =
      lastPredictionId === "simulation" || (!audioUrl && debugAudioUrl)
        ? "wav"
        : audioFormat === "pcm"
          ? "pcm"
          : audioFormat
    const short = lastPredictionId
      ? lastPredictionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "output"
      : "debug"
    return `beatfusion-${short}.${ext}`
  }, [effectiveAudioUrl, audioUrl, debugAudioUrl, audioFormat, lastPredictionId])

  const lyricsDisplay = useMemo(() => {
    if (!lyricsStreaming) return lyrics
    return (lyricsStreamPrefix + lyricsStreamBuffer).slice(0, 3500)
  }, [lyrics, lyricsStreaming, lyricsStreamPrefix, lyricsStreamBuffer])

  const lyricsStreamPreview = useMemo(() => {
    return (lyricsStreamPrefix + lyricsStreamBuffer).slice(0, 3500)
  }, [lyricsStreamPrefix, lyricsStreamBuffer])

  useEffect(() => {
    try {
      if (localStorage.getItem(DEV_KEY) === "1") setDevOpen(true)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(DEV_KEY, devOpen ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [devOpen])

  useEffect(() => {
    return () => {
      if (audioUrl?.startsWith("blob:")) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => setTick((n) => n + 1), 2200)
    return () => window.clearInterval(id)
  }, [busy])

  useEffect(() => {
    if (busy) {
      setRailOpen(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setRailEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setRailEntered(false)
    const t = window.setTimeout(() => setRailOpen(false), 360)
    return () => window.clearTimeout(t)
  }, [busy])

  useEffect(() => {
    if (lyricsStreaming) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setLyricsStreamEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setLyricsStreamEntered(false)
  }, [lyricsStreaming])

  useEffect(() => {
    return () => {
      lyricsAbortRef.current?.abort()
      generateAbortRef.current?.abort()
    }
  }, [])

  const statusHint = STATUS_LINES[tick % STATUS_LINES.length]

  const payload = useMemo((): BeatFusionGenerateBody => {
    return {
      lyrics,
      prompt: prompt || undefined,
      sample_rate: Number(sampleRate) as BeatFusionGenerateBody["sample_rate"],
      bitrate: Number(bitrate) as BeatFusionGenerateBody["bitrate"],
      audio_format: audioFormat as BeatFusionGenerateBody["audio_format"],
    }
  }, [lyrics, prompt, sampleRate, bitrate, audioFormat])

  const stateJson = useMemo(
    () =>
      JSON.stringify(
        {
          busy,
          progress,
          hasAudio: !!audioUrl,
          showPlayer,
          playerDockVisible,
          lyricsStreaming,
          lyricsPanelCollapsed,
          model: BEATFUSION_MODEL,
          coverModel: effectiveImageModel,
          devOpen,
          simulateGeneration,
      showToolsCard,
      debugLayout: debug,
      lyricsModel: effectiveLyricsModel,
    },
        null,
        2,
      ),
    [
      busy,
      progress,
      audioUrl,
      showPlayer,
      playerDockVisible,
      lyricsStreaming,
      lyricsPanelCollapsed,
      devOpen,
      simulateGeneration,
      showToolsCard,
      debug,
      effectiveImageModel,
      effectiveLyricsModel,
    ],
  )

  const runSimulate = useCallback(async () => {
    setBusy(true)
    setAudioUrl(null)
    setAudioGenerationComplete(false)
    setLastPredictionId(null)
    setCoverUrl(null)
    setProgress(0)
    setCompleteRaw(null)
    setErrorMessage(null)
    setPhaseLine("Starting…")
    setReqJson(JSON.stringify({ mode: "simulate", model: BEATFUSION_MODEL, input: payload }, null, 2))
    setLogs((l) => appendLog(l, `[${new Date().toISOString()}] simulate generation`))

    try {
      const steps = 36
      for (let i = 0; i <= steps; i++) {
        await sleep(120)
        setProgress(Math.round((i / steps) * 100))
        setPhaseLine(STATUS_LINES[i % STATUS_LINES.length])
      }
      const url = createDemoWavObjectUrl()
      setAudioUrl(url)
      setLastPredictionId("simulation")
      setAudioGenerationComplete(true)
      setPhaseLine("Done")
      setCompleteRaw(JSON.stringify({ mode: "simulate", demo: true }, null, 2))
      toast({ title: "Simulation complete", description: "Demo audio loaded — try the player and waveform." })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Simulation failed"
      setPhaseLine(msg)
      setErrorMessage(msg)
      toast({ variant: "destructive", title: "Simulation failed", description: msg })
    } finally {
      setBusy(false)
    }
  }, [payload, toast])

  const run = useCallback(async () => {
    if (simulateGeneration) {
      await runSimulate()
      return
    }

    if (!canUseSkytells) {
      toast({
        variant: "destructive",
        title: "Skytells isn’t configured",
        description: "Open settings to add your API key, or set SKYTELLS_API_KEY for the server.",
      })
      openSettings()
      return
    }

    setBusy(true)
    setAudioUrl(null)
    setAudioGenerationComplete(false)
    setLastPredictionId(null)
    setCoverUrl(null)
    setProgress(null)
    setCompleteRaw(null)
    setErrorMessage(null)
    setPhaseLine("Starting…")
    setReqJson(JSON.stringify({ model: BEATFUSION_MODEL, input: payload }, null, 2))
    setLogs((l) => appendLog(l, `[${new Date().toISOString()}] POST /api/generate`))

    generateAbortRef.current?.abort()
    const ac = new AbortController()
    generateAbortRef.current = ac
    const signal = ac.signal

    let failed = false
    let asyncPredictionId: string | null = null

    try {
      await consumeSse(
        {
          lyrics: payload.lyrics,
          prompt: payload.prompt,
          sample_rate: payload.sample_rate,
          bitrate: payload.bitrate,
          audio_format: payload.audio_format,
        },
        (ev) => {
          setLastEv(JSON.stringify(ev, null, 2))
          if (devOpenRef.current) setLogs((l) => appendLog(l, `[sse] ${ev.type}`))

          if (ev.type === "init") setPhaseLine("Working…")
          if (ev.type === "progress") {
            const st = (ev.prediction as { status?: string })?.status
            setPhaseLine(st ? st : "Processing…")
            const p = (ev.prediction as { metrics?: { progress?: number } })?.metrics?.progress
            setProgress(typeof p === "number" ? p : null)
          }
          if (ev.type === "prediction_started") {
            asyncPredictionId = ev.predictionId
            setLastPredictionId(ev.predictionId)
            const st = (ev.prediction as { status?: string })?.status
            setPhaseLine(st ? st : "Queued…")
            const p = (ev.prediction as { metrics?: { progress?: number } })?.metrics?.progress
            setProgress(typeof p === "number" ? p : null)
          }
          if (ev.type === "complete") {
            setCompleteRaw(JSON.stringify(ev.raw ?? ev, null, 2))
            if (ev.audioUrl) {
              setAudioUrl(ev.audioUrl)
              setLastPredictionId(ev.predictionId)
              setAudioGenerationComplete(true)
              setPhaseLine("Done")
              toast({ title: "Ready", description: ev.predictionId })
            } else {
              failed = true
              const m = "No audio URL in response."
              setPhaseLine(m)
              setErrorMessage(m)
              toast({
                variant: "destructive",
                title: "Unexpected response",
                description: m,
              })
            }
          }
          if (ev.type === "error") {
            failed = true
            setPhaseLine(ev.message)
            setErrorMessage(ev.message)
            toast({
              variant: "destructive",
              title: "Couldn’t generate",
              description: ev.message,
            })
            setLogs((l) => appendLog(l, `[error] ${ev.message}`))
          }
        },
        skytellsHeaders,
      )

      if (signal.aborted) return

      if (asyncPredictionId && !failed) {
        for (;;) {
          if (signal.aborted) return
          const res = await fetch(
            `/api/prediction?id=${encodeURIComponent(asyncPredictionId)}`,
            { headers: { ...skytellsHeaders }, signal },
          )
          const j = (await res.json().catch(() => ({}))) as PredictionPollJson
          if (!res.ok) {
            failed = true
            const m = j.error ?? `HTTP ${res.status}`
            setPhaseLine(m)
            setErrorMessage(m)
            toast({ variant: "destructive", title: "Couldn’t check status", description: m })
            break
          }

          const st = j.status ?? ""
          setPhaseLine(st ? st : "Processing…")
          const prog = (j.raw as { metrics?: { progress?: number } } | undefined)?.metrics?.progress
          setProgress(typeof prog === "number" ? prog : null)

          if (st === "succeeded") {
            setCompleteRaw(JSON.stringify(j.raw ?? j, null, 2))
            if (j.audioUrl) {
              setAudioUrl(j.audioUrl)
              setLastPredictionId(j.predictionId ?? asyncPredictionId)
              setAudioGenerationComplete(true)
              setPhaseLine("Done")
              toast({ title: "Ready", description: j.predictionId ?? asyncPredictionId })
            } else {
              failed = true
              const m = "No audio URL in response."
              setPhaseLine(m)
              setErrorMessage(m)
              toast({
                variant: "destructive",
                title: "Unexpected response",
                description: m,
              })
            }
            break
          }

          if (st === "failed") {
            failed = true
            const raw = j.raw as { response?: string } | undefined
            const m =
              typeof raw?.response === "string" && raw.response.trim()
                ? raw.response.trim()
                : "Prediction failed."
            setPhaseLine(m)
            setErrorMessage(m)
            toast({ variant: "destructive", title: "Generation failed", description: m })
            break
          }

          if (st === "cancelled") {
            failed = true
            const m = "Generation was cancelled."
            setPhaseLine(m)
            setErrorMessage(m)
            toast({ variant: "destructive", title: "Cancelled", description: m })
            break
          }

          await sleep(PREDICTION_POLL_MS, signal)
        }
      } else if (!asyncPredictionId && !failed) {
        const m = "Connection closed before completion."
        setPhaseLine(m)
        setErrorMessage(m)
        toast({
          variant: "destructive",
          title: "Connection closed",
          description: "Try again.",
        })
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      const msg = e instanceof Error ? e.message : "Unknown error"
      setPhaseLine(msg)
      setErrorMessage(msg)
      toast({ variant: "destructive", title: "Request failed", description: msg })
      setLogs((l) => appendLog(l, `[error] ${msg}`))
    } finally {
      if (generateAbortRef.current === ac) generateAbortRef.current = null
      setBusy(false)
    }
  }, [
    payload,
    toast,
    simulateGeneration,
    runSimulate,
    canUseSkytells,
    openSettings,
    skytellsHeaders,
  ])

  const copyLyrics = async () => {
    try {
      await navigator.clipboard.writeText(lyricsDisplay)
      toast({ title: "Copied", description: "Lyrics copied to clipboard." })
    } catch {
      toast({ variant: "destructive", title: "Copy failed" })
    }
  }

  const copyStyle = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast({ title: "Copied", description: "Style line copied." })
    } catch {
      toast({ variant: "destructive", title: "Copy failed" })
    }
  }

  const finalizeLyricsFromStream = useCallback((buffer: string) => {
    const prefix = lyricsPrefixRef.current
    setLyrics((prefix + buffer).slice(0, 3500))
  }, [])

  const stopLyricsStream = useCallback(() => {
    lyricsAbortRef.current?.abort()
  }, [])

  const generateLyricsWithAi = useCallback(async () => {
    if (!prompt.trim() && !lyricsIdea.trim()) {
      toast({
        variant: "destructive",
        title: "Add a style or an idea",
        description: "Fill the style line and/or the idea field so the model has context.",
      })
      return
    }

    if (!canUseSkytells) {
      toast({
        variant: "destructive",
        title: "Skytells isn’t configured",
        description: "Add your API key in settings or configure the server.",
      })
      openSettings()
      return
    }

    const ac = new AbortController()
    lyricsAbortRef.current = ac

    const prefix = replaceLyricsWithAi ? "" : `${lyrics.trim()}${lyrics.trim() ? "\n\n" : ""}`
    lyricsPrefixRef.current = prefix
    lyricsStreamBufferRef.current = ""
    setLyricsStreamPrefix(prefix)
    setLyricsStreamBuffer("")
    setLyricsStreaming(true)
    setLyricsAiOpen(true)
    setLyricsPanelCollapsed(false)
    setLyricsBusy(true)

    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...skytellsHeaders },
        body: JSON.stringify({ idea: lyricsIdea, styleHint: prompt, stream: true }),
        signal: ac.signal,
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body.")

      /** Batch token deltas to one React update per frame (avoids jank during fast streams). */
      const pending = { current: "" as string }
      let rafId = 0
      const flushPending = () => {
        rafId = 0
        const chunk = pending.current
        pending.current = ""
        if (!chunk) return
        setLyricsStreamBuffer((prev) => {
          const next = (prev + chunk).slice(0, 3500)
          lyricsStreamBufferRef.current = next
          return next
        })
      }
      const scheduleFlush = () => {
        if (rafId) return
        rafId = requestAnimationFrame(flushPending)
      }

      await consumeLyricsSse(reader, (delta) => {
        pending.current += delta
        scheduleFlush()
      })

      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      flushPending()

      const buf = lyricsStreamBufferRef.current
      if (buf.trim()) {
        finalizeLyricsFromStream(buf)
        toast({ title: "Lyrics ready", description: "Review and edit before generating audio." })
      } else {
        toast({ variant: "destructive", title: "Empty response", description: "Try again with a clearer prompt." })
      }
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError")
      if (aborted) {
        const buf = lyricsStreamBufferRef.current
        if (buf.trim()) {
          finalizeLyricsFromStream(buf)
          toast({ title: "Stopped", description: "Partial lyrics were saved." })
        } else {
          toast({ title: "Stopped", description: "No text was streamed yet." })
        }
      } else {
        const msg = e instanceof Error ? e.message : "Request failed"
        toast({ variant: "destructive", title: "Couldn’t generate lyrics", description: msg })
      }
    } finally {
      setLyricsStreaming(false)
      setLyricsBusy(false)
      lyricsStreamBufferRef.current = ""
      lyricsAbortRef.current = null
    }
  }, [
    finalizeLyricsFromStream,
    lyrics,
    lyricsIdea,
    prompt,
    replaceLyricsWithAi,
    toast,
    canUseSkytells,
    openSettings,
    skytellsHeaders,
  ])

  const generateCoverArt = useCallback(async () => {
    if (!canUseSkytells) {
      toast({
        variant: "destructive",
        title: "Skytells isn’t configured",
        description: "Add your API key in settings or configure the server.",
      })
      openSettings()
      return
    }

    setCoverBusy(true)
    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...skytellsHeaders },
        body: JSON.stringify({
          prompt: coverPrompt.trim() || undefined,
          lyrics,
          style: prompt,
          aspect_ratio: coverAspect,
        }),
      })
      const j = (await res.json()) as { error?: string; imageUrl?: string }
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      if (j.imageUrl) {
        setCoverUrl(j.imageUrl)
        toast({ title: "Cover ready", description: `Generated with ${effectiveImageModel}.` })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed"
      toast({ variant: "destructive", title: "Couldn’t generate cover", description: msg })
    } finally {
      setCoverBusy(false)
    }
  }, [
    coverAspect,
    coverPrompt,
    lyrics,
    prompt,
    toast,
    canUseSkytells,
    openSettings,
    skytellsHeaders,
    effectiveImageModel,
  ])

  const downloadCoverImage = useCallback(async () => {
    if (!coverUrl) return
    const raw = coverUrl.split(".").pop()?.split("?")[0] ?? "png"
    const safe = /^(png|jpe?g|webp)$/i.test(raw) ? raw : "png"
    try {
      const res = await fetch("/api/download-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: coverUrl, filename: `cover.${safe}` }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const a = document.createElement("a")
      const u = URL.createObjectURL(blob)
      a.href = u
      a.download = `cover.${safe}`
      a.click()
      URL.revokeObjectURL(u)
      toast({ title: "Download started", description: "Saving cover image." })
    } catch {
      window.open(coverUrl, "_blank", "noopener,noreferrer")
    }
  }, [coverUrl, toast])

  const showLyricsAiChrome = lyricsAiOpen || lyricsStreaming || lyricsBusy

  return (
    <div
      className={cn(
        "relative space-y-10 transition-[padding] duration-300 ease-out",
        /* Only the generation rail is fixed; player dock is in-flow — extra pr would bunch content left. */
        (railOpen || debug.generationRail) && "lg:pr-[min(424px,42vw)]",
        orchestratorVisible && !lyricsPanelCollapsed && "lg:pl-[min(380px,42vw)]",
      )}
    >
      {errorMessage && !busy && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex w-full flex-col gap-10 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 w-full flex-1">
          <section className="skytells-card border-border bg-card/40 space-y-6 rounded-lg border p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-foreground text-sm font-medium tracking-tight">Compose</h2>
            <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
              Describe the track and paste lyrics. Use “NNN BPM” in the style line for tempo-aware visuals.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openSettings()}
            className="skytells-btn-outline h-9 shrink-0 gap-2 rounded-full text-[12px]"
            aria-label="Skytells API and model settings"
          >
            <Settings2 className="size-3.5" />
            Skytells
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.08em]">
              Lyrics
            </Label>
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {lyricsDisplay.trim().length} / 3500
            </span>
          </div>
          <LyricsInput
            value={lyricsDisplay}
            onChange={(e) => setLyrics(e.target.value.slice(0, 3500))}
            maxLength={3500}
            readOnly={lyricsStreaming}
            busy={busy}
            onGenerate={() => void run()}
            lyricsAiEnabled={lyricsAiOpen}
            onLyricsAiToggle={() => setLyricsAiOpen((v) => !v)}
            lyricsAiToggleDisabled={lyricsBusy || busy}
            generateDisabled={skytellsGenerateBlocked}
          />
          {showLyricsAiChrome && (
            <div className="border-border skytells-input space-y-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="lyrics-idea" className="text-muted-foreground text-[11px] font-normal">
                  Idea for AI (optional)
                </Label>
                <input
                  id="lyrics-idea"
                  type="text"
                  value={lyricsIdea}
                  onChange={(e) => setLyricsIdea(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. late-night drive, letting go, summer rain"
                  className="border-border bg-background/60 focus-visible:ring-foreground/20 w-full rounded-md border px-3 py-2 text-[13px] outline-none"
                  disabled={lyricsBusy || busy}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="replace-lyrics"
                    checked={replaceLyricsWithAi}
                    onCheckedChange={setReplaceLyricsWithAi}
                    disabled={lyricsBusy || busy}
                  />
                  <Label htmlFor="replace-lyrics" className="cursor-pointer text-[12px] font-normal">
                    Replace lyrics (off = append)
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="skytells-btn-outline h-9 gap-2 text-[12px]"
                  disabled={(busy && !lyricsStreaming) || (!canUseSkytells && !lyricsStreaming)}
                  onClick={() => (lyricsStreaming ? stopLyricsStream() : void generateLyricsWithAi())}
                >
                  {lyricsStreaming ? (
                    <>
                      <Square className="size-3.5" />
                      Stop
                    </>
                  ) : lyricsBusy ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Streams from <span className="font-mono">{effectiveLyricsModel}</span> with your style line
                {lyricsIdea.trim() ? " and idea" : ""}. The orchestrator panel shows live output.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.08em]">
            Style
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            rows={2}
            className="skytells-input border-border focus-visible:ring-foreground/20 resize-none rounded-md border text-[13px]"
            placeholder="Genre, mood, tempo…"
          />
        </div>

        <Collapsible className="border-border skytells-input rounded-md border">
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-medium transition-colors">
            Advanced encoding
            <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-border border-t px-4 pb-4">
            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-[11px] uppercase tracking-wide">Sample rate</Label>
                <Select value={sampleRate} onValueChange={setSampleRate}>
                  <SelectTrigger className="skytells-input w-full border text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16000">16 kHz</SelectItem>
                    <SelectItem value="24000">24 kHz</SelectItem>
                    <SelectItem value="32000">32 kHz</SelectItem>
                    <SelectItem value="44100">44.1 kHz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-[11px] uppercase tracking-wide">Bitrate</Label>
                <Select value={bitrate} onValueChange={setBitrate}>
                  <SelectTrigger className="skytells-input w-full border text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32000">32k</SelectItem>
                    <SelectItem value="64000">64k</SelectItem>
                    <SelectItem value="128000">128k</SelectItem>
                    <SelectItem value="256000">256k</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-[11px] uppercase tracking-wide">Format</Label>
                <Select value={audioFormat} onValueChange={setAudioFormat}>
                  <SelectTrigger className="skytells-input w-full border text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp3">MP3</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="pcm">PCM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-col gap-4 border-t border-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="simulate" checked={simulateGeneration} onCheckedChange={setSimulateGeneration} />
              <Label htmlFor="simulate" className="cursor-pointer text-[13px] font-normal">
                Simulate generation
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="dev" checked={devOpen} onCheckedChange={setDevOpen} />
              <Label htmlFor="dev" className="cursor-pointer text-[13px] font-normal">
                Developer
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="tools-card" checked={showToolsCard} onCheckedChange={setShowToolsCard} />
              <Label htmlFor="tools-card" className="cursor-pointer text-[13px] font-normal">
                Tools card
              </Label>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={busy || skytellsGenerateBlocked}
            onClick={() => void run()}
            className={cn(
              "skytells-btn-primary h-11 w-full rounded-full px-8 text-[14px] font-medium sm:w-auto",
            )}
          >
            {busy ? "Generating…" : simulateGeneration ? "Run simulation" : "Generate"}
          </Button>
        </div>
          </section>
        </div>

      {showPlayerColumn && effectiveAudioUrl && (
        <div
          aria-hidden={orchestratorVisible}
          className={cn(
            "relative mb-8 flex w-full shrink-0 flex-col gap-1 lg:mb-0 lg:min-h-0 lg:w-full lg:max-w-[420px] lg:max-h-[min(calc(100dvh-6rem),100%)] lg:overflow-y-auto lg:bg-background/98 lg:px-3 lg:py-4 lg:pb-5 lg:shadow-2xl",
            "before:pointer-events-none before:absolute before:left-0 before:top-1/2 before:hidden before:h-[88%] before:w-px before:-translate-y-1/2 before:bg-border/70 lg:before:block",
            orchestratorVisible && "hidden",
          )}
        >
          <AudioPlayerWaveform
            src={effectiveAudioUrl}
            downloadFilename={audioDownloadFilename}
            className="border-border bg-card/40 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-4 lg:shadow-none"
          />
          <div className="border-border bg-card/40 skytells-card mt-4 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.12em]">
                Cover art
              </p>
              <span className="text-muted-foreground font-mono text-[10px]">{effectiveImageModel}</span>
            </div>
            <p className="text-muted-foreground mb-4 text-[12px] leading-relaxed">
              Optional prompt overrides auto style + lyrics. Square works well for streaming thumbnails.
            </p>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] uppercase tracking-wide">Aspect</Label>
                <Select value={coverAspect} onValueChange={setCoverAspect} disabled={coverBusy}>
                  <SelectTrigger className="skytells-input w-full border text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              value={coverPrompt}
              onChange={(e) => setCoverPrompt(e.target.value)}
              maxLength={4000}
              rows={2}
              placeholder="Custom cover prompt (optional — leave empty to use style + lyrics)"
              className="skytells-input border-border focus-visible:ring-foreground/20 mb-4 resize-none rounded-md border px-3 py-2.5 text-[13px]"
              disabled={coverBusy}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="skytells-btn-outline h-9 gap-2 text-[12px]"
                disabled={coverBusy || !canUseSkytells}
                onClick={() => void generateCoverArt()}
              >
                {coverBusy ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-3.5" />
                    Generate cover
                  </>
                )}
              </Button>
              {coverUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="skytells-btn-outline h-9 gap-2 text-[12px]"
                  onClick={() => void downloadCoverImage()}
                >
                  <Download className="size-3.5" />
                  Download cover
                </Button>
              )}
            </div>
            {coverUrl && (
              <div className="border-border mt-5 overflow-hidden rounded-md border">
                <img src={coverUrl} alt="Generated cover" className="bg-background/40 max-h-56 w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {(showToolsCard || debug.toolsCard) && (
        <section className="skytells-card border-border bg-card/30 space-y-4 rounded-lg border p-5 sm:p-6">
          <h3 className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.12em]">Tools</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <span>
                BPM from style:{" "}
                <span className="text-foreground font-mono tabular-nums">{bpmHint != null ? `${bpmHint}` : "—"}</span>
              </span>
              <span>
                Words:{" "}
                <span className="text-foreground font-mono tabular-nums">
                  {lyricsDisplay.trim() ? lyricsDisplay.trim().split(/\s+/).length : 0}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="skytells-btn-outline h-8 gap-2 text-[12px]" onClick={() => void copyLyrics()}>
                <Copy className="size-3.5" />
                Copy lyrics
              </Button>
              <Button type="button" variant="outline" size="sm" className="skytells-btn-outline h-8 gap-2 text-[12px]" onClick={() => void copyStyle()}>
                <Copy className="size-3.5" />
                Copy style
              </Button>
            </div>
          </div>
        </section>
      )}

      {orchestratorVisible && (
        <LyricsOrchestratorPanel
          entered={lyricsStreamEntered || debug.orchestrator}
          collapsed={lyricsPanelCollapsed}
          onCollapse={() => setLyricsPanelCollapsed(true)}
          streamPreview={lyricsStreaming ? lyricsStreamPreview : DEBUG_ORCHESTRATOR_PREVIEW}
          onStop={() => {
            if (lyricsStreaming) stopLyricsStream()
            else setOrchestrator(false)
          }}
        />
      )}

      {orchestratorVisible && lyricsPanelCollapsed && (
        <button
          type="button"
          onClick={() => setLyricsPanelCollapsed(false)}
          className="border-border bg-background/95 text-foreground hover:bg-foreground/5 fixed bottom-6 left-4 z-[37] flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium shadow-lg backdrop-blur-md transition-colors sm:left-6"
          aria-label="Show lyrics stream"
        >
          <span className="bg-foreground size-1.5 shrink-0 animate-pulse rounded-full" aria-hidden />
          <Sparkles className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span>Lyrics</span>
        </button>
      )}

      {railVisible && (
        <aside
          aria-label="Generation progress"
          className={cn(
            "border-border bg-background/88 skytells-card contain-layout fixed top-[7.5rem] right-0 z-40 flex max-h-[calc(100dvh-7.5rem)] w-full max-w-[420px] flex-col border-l border-dashed shadow-2xl transition-transform duration-300 ease-out lg:top-16 lg:max-h-[calc(100dvh-4rem)]",
            railInView ? "translate-x-0" : "translate-x-full",
          )}
          aria-live="polite"
          aria-busy={busy}
        >
          <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
            <span className="text-muted-foreground font-mono text-[10px] font-medium uppercase tracking-[0.14em]">
              Generation
            </span>
            {bpmHint != null && (
              <span className="text-muted-foreground font-mono text-[10px] tabular-nums">{bpmHint} BPM</span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3">
              <span className="border-border bg-secondary text-foreground inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium tracking-wide">
                <span
                  className={cn("bg-foreground size-1.5 rounded-full", busy ? "animate-pulse" : "opacity-40")}
                  aria-hidden
                />
                {busy ? (simulateGeneration ? "Simulating" : "Generating") : "Done"}
              </span>
              <p className="text-foreground text-base font-medium tracking-tight">{busy ? statusHint : "Track ready"}</p>
              <p className="text-muted-foreground text-[13px]">{busy ? phaseLine : "You can review the output below."}</p>
            </div>
            {progress != null && busy && (
              <div className="mb-6">
                <Progress value={progress} className="bg-secondary h-1.5" />
                <p className="text-muted-foreground mt-2 font-mono text-[11px] tabular-nums">{Math.round(progress)}%</p>
              </div>
            )}
            <BeatReactiveVisualizer prompt={prompt} active={busy || (debug.generationRail && !railOpen)} />
          </div>
        </aside>
      )}

      <Sheet open={devOpen} onOpenChange={setDevOpen}>
        <SheetContent
          side="right"
          className="flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <Tabs defaultValue="request" className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="bg-background sticky top-0 z-10 border-b border-border px-6 pb-4 pt-6">
                <SheetHeader className="space-y-1 p-0 pr-10 text-left">
                  <SheetTitle>Developer</SheetTitle>
                  <SheetDescription>Request, stream, response, state, logs.</SheetDescription>
                </SheetHeader>
                <TabsList className="mt-4 grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
                  <TabsTrigger value="request" className="text-xs sm:text-sm">
                    Request
                  </TabsTrigger>
                  <TabsTrigger value="stream" className="text-xs sm:text-sm">
                    Stream
                  </TabsTrigger>
                  <TabsTrigger value="complete" className="text-xs sm:text-sm">
                    Response
                  </TabsTrigger>
                  <TabsTrigger value="state" className="text-xs sm:text-sm">
                    State
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="col-span-2 sm:col-span-1 text-xs sm:text-sm">
                    Logs
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="px-6 pb-10 pt-5">
                <TabsContent value="request" className="mt-0 data-[state=inactive]:hidden">
                  <ScrollArea className="border-border skytells-input h-[min(55vh,380px)] rounded-md border p-3">
                    <pre className="text-foreground font-mono text-[11px] break-all whitespace-pre-wrap">{reqJson ?? "—"}</pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="stream" className="mt-0 data-[state=inactive]:hidden">
                  <ScrollArea className="border-border skytells-input h-[min(55vh,380px)] rounded-md border p-3">
                    <pre className="text-foreground font-mono text-[11px] break-all whitespace-pre-wrap">{lastEv ?? "—"}</pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="complete" className="mt-0 data-[state=inactive]:hidden">
                  <ScrollArea className="border-border skytells-input h-[min(55vh,380px)] rounded-md border p-3">
                    <pre className="text-foreground font-mono text-[11px] break-all whitespace-pre-wrap">{completeRaw ?? "—"}</pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="state" className="mt-0 data-[state=inactive]:hidden">
                  <ScrollArea className="border-border skytells-input h-[min(55vh,380px)] rounded-md border p-3">
                    <pre className="text-foreground font-mono text-[11px]">{stateJson}</pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="logs" className="mt-0 data-[state=inactive]:hidden">
                  <ScrollArea className="border-border skytells-input h-[min(55vh,380px)] rounded-md border p-3">
                    <pre className="text-foreground font-mono text-[11px] whitespace-pre-wrap">{logs.length ? logs.join("\n") : "—"}</pre>
                  </ScrollArea>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  )
}
