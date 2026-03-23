"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Copy, Download, Pause, Play, Repeat, Volume2, VolumeX } from "lucide-react"
import { proxiedPlaybackUrl } from "@/lib/skytells-asset-url"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

/** Resolve theme tokens to RGB for canvas (not all browsers return hex from getPropertyValue). */
function parseCssColor(value: string): [number, number, number] {
  const t = value.trim()
  const rgb = t.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hex6 = t.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (hex6) return [parseInt(hex6[1], 16), parseInt(hex6[2], 16), parseInt(hex6[3], 16)]
  const hex3 = t.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i)
  if (hex3) {
    return [
      parseInt(hex3[1] + hex3[1], 16),
      parseInt(hex3[2] + hex3[2], 16),
      parseInt(hex3[3] + hex3[3], 16),
    ]
  }
  return [115, 115, 115]
}

function readWaveformThemeColors(): { fg: [number, number, number]; mg: [number, number, number] } {
  const root = getComputedStyle(document.documentElement)
  return {
    fg: parseCssColor(root.getPropertyValue("--foreground")),
    mg: parseCssColor(root.getPropertyValue("--muted-foreground")),
  }
}

function downsamplePeaks(channel: Float32Array, bins: number): Float32Array {
  const block = Math.floor(channel.length / bins)
  const out = new Float32Array(bins)
  if (block < 1) {
    for (let i = 0; i < bins; i++) out[i] = 0
    return out
  }
  for (let i = 0; i < bins; i++) {
    const start = i * block
    const end = start + block
    let peak = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j] ?? 0)
      if (v > peak) peak = v
    }
    out[i] = peak
  }
  return out
}

type Props = {
  src: string
  className?: string
  /** Suggested filename when saving (e.g. `track.mp3`). */
  downloadFilename?: string
}

/**
 * Clean player: static waveform from decoded buffer + live time-domain line while playing.
 */
export function AudioPlayerWaveform({ src, className, downloadFilename }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const peaksRef = useRef<Float32Array | null>(null)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState("1")
  const [loop, setLoop] = useState(false)

  const rateNum = useMemo(() => Number(playbackRate) || 1, [playbackRate])

  /** CDN audio is not CORS-enabled; load via same-origin proxy for decode + `<audio>`. */
  const playbackSrc = useMemo(() => proxiedPlaybackUrl(src), [src])

  const drawOnce = useCallback(() => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (!canvas || !audio) return
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width * dpr))
    const h = Math.max(1, Math.floor(rect.height * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, w, h)

    const { fg, mg } = readWaveformThemeColors()
    const mid = h / 2
    const peaks = peaksRef.current
    const analyser = analyserRef.current
    const isPlaying = !audio.paused && analyser

    ctx.strokeStyle = `rgba(${mg[0]},${mg[1]},${mg[2]},0.4)`
    ctx.lineWidth = 1 * dpr
    ctx.beginPath()
    ctx.moveTo(0, mid)
    ctx.lineTo(w, mid)
    ctx.stroke()

    if (peaks && peaks.length > 1) {
      const step = w / (peaks.length - 1)
      ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},0.22)`
      ctx.lineWidth = 1 * dpr
      ctx.beginPath()
      for (let i = 0; i < peaks.length; i++) {
        const x = i * step
        const ph = peaks[i] ?? 0
        const y1 = mid - ph * mid * 0.92
        const y2 = mid + ph * mid * 0.92
        ctx.moveTo(x, y1)
        ctx.lineTo(x, y2)
      }
      ctx.stroke()
    }

    if (isPlaying && analyser) {
      const bufferLength = analyser.frequencyBinCount
      const data = new Uint8Array(bufferLength)
      analyser.getByteTimeDomainData(data)
      ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},0.88)`
      ctx.lineWidth = 1.25 * dpr
      ctx.beginPath()
      const slice = w / bufferLength
      for (let i = 0; i < bufferLength; i++) {
        const v = data[i]! / 128 - 1
        const x = i * slice
        const y = mid + v * mid * 0.85
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    const dur = Number.isFinite(audio.duration) ? audio.duration : 0
    if (dur > 0) {
      const p = audio.currentTime / dur
      ctx.fillStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},0.08)`
      ctx.fillRect(0, 0, w * p, h)
      ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},0.85)`
      ctx.lineWidth = 1 * dpr
      ctx.beginPath()
      ctx.moveTo(w * p, 0)
      ctx.lineTo(w * p, h)
      ctx.stroke()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    peaksRef.current = null
    setReady(false)

    const run = async () => {
      try {
        const res = await fetch(playbackSrc)
        const ab = await res.arrayBuffer()
        const AC =
          typeof window !== "undefined"
            ? window.AudioContext ||
              (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
            : null
        if (!AC) return
        const ac = new AC()
        const buf = await ac.decodeAudioData(ab.slice(0))
        if (cancelled) return
        const ch = buf.getChannelData(0)
        const bins = Math.min(240, Math.max(120, Math.floor(buf.duration * 8)))
        peaksRef.current = downsamplePeaks(ch, bins)
      } catch {
        peaksRef.current = null
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [playbackSrc])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.loop = loop
    audio.playbackRate = rateNum
    audio.volume = muted ? 0 : volume
  }, [loop, rateNum, volume, muted, playbackSrc])

  useEffect(() => {
    let raf = 0
    const loopDraw = () => {
      drawOnce()
      raf = requestAnimationFrame(loopDraw)
    }
    raf = requestAnimationFrame(loopDraw)
    const ro = new ResizeObserver(() => drawOnce())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [drawOnce, playbackSrc, ready])

  const ensureGraph = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || sourceRef.current) return
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ac = ctxRef.current ?? new AC()
    ctxRef.current = ac
    if (ac.state === "suspended") await ac.resume()
    const srcNode = ac.createMediaElementSource(audio)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.65
    srcNode.connect(analyser)
    analyser.connect(ac.destination)
    sourceRef.current = srcNode
    analyserRef.current = analyser
  }, [])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    await ensureGraph()
    if (audio.paused) {
      await audio.play()
      setPlaying(true)
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  const onSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (!canvas || !audio) return
    const dur = Number.isFinite(audio.duration) ? audio.duration : duration
    if (!(dur > 0)) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const p = Math.min(1, Math.max(0, x / rect.width))
    audio.currentTime = p * dur
    setCurrentTime(audio.currentTime)
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(src)
    } catch {
      /* ignore */
    }
  }

  const downloadAudio = async () => {
    if (src.startsWith("blob:")) {
      const a = document.createElement("a")
      a.href = src
      a.download = downloadFilename ?? "beatfusion-audio.wav"
      a.click()
      return
    }
    if (src.startsWith("https://")) {
      try {
        const res = await fetch("/api/download-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: src, filename: downloadFilename ?? "track.mp3" }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `HTTP ${res.status}`)
        }
        const blob = await res.blob()
        const a = document.createElement("a")
        const url = URL.createObjectURL(blob)
        a.href = url
        a.download = downloadFilename ?? "track.mp3"
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        window.open(src, "_blank", "noopener,noreferrer")
      }
      return
    }
    window.open(src, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      className={cn(
        "border-border bg-card/40 skytells-card rounded-lg border p-5 sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.12em]">
          Player
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="loop" className="text-muted-foreground cursor-pointer text-xs font-normal">
              Loop
            </Label>
            <Switch id="loop" checked={loop} onCheckedChange={setLoop} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Speed</span>
            <Select value={playbackRate} onValueChange={setPlaybackRate}>
              <SelectTrigger className="skytells-input h-8 w-[88px] border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.75">0.75×</SelectItem>
                <SelectItem value="1">1×</SelectItem>
                <SelectItem value="1.25">1.25×</SelectItem>
                <SelectItem value="1.5">1.5×</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative mb-5 w-full">
        <canvas
          ref={canvasRef}
          className="bg-background/60 skytells-input h-28 w-full cursor-pointer rounded-md border"
          onClick={onSeek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
          onKeyDown={(e) => {
            const audio = audioRef.current
            if (!audio) return
            const dur = Number.isFinite(audio.duration) ? audio.duration : duration
            if (!(dur > 0)) return
            if (e.key === " " || e.code === "Space") {
              e.preventDefault()
              void togglePlay()
            }
            if (e.key === "ArrowRight") audio.currentTime = Math.min(dur, audio.currentTime + 5)
            if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5)
          }}
        />
        <audio
          ref={audioRef}
          src={playbackSrc}
          className="hidden"
          crossOrigin={playbackSrc.startsWith("/") ? undefined : "anonymous"}
          onTimeUpdate={() => {
            const a = audioRef.current
            if (a) setCurrentTime(a.currentTime)
          }}
          onLoadedMetadata={() => {
            const a = audioRef.current
            if (a && Number.isFinite(a.duration)) setDuration(a.duration)
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="default"
            size="icon"
            className="skytells-btn-primary rounded-full"
            onClick={() => void togglePlay()}
            disabled={!ready}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 pl-0.5" />}
          </Button>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:max-w-md sm:justify-end">
          <div className="flex min-w-[140px] flex-1 items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setMuted(false)
                setVolume(Number(e.target.value))
              }}
              className="accent-foreground h-1 flex-1 cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="skytells-btn-outline h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => void copyLink()}
            >
              <Copy className="size-3.5" />
              Copy URL
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="skytells-btn-outline h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => void downloadAudio()}
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-2 border-t border-border/80 pt-5 text-[11px]">
        <Repeat className="size-3.5 shrink-0 opacity-70" />
        <span>Click waveform to seek · Space / arrows when focused</span>
      </div>
    </div>
  )
}
