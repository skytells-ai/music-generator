"use client"

import type React from "react"
import type { ChangeEvent } from "react"
import { useCallback, useLayoutEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp, Loader2, Sparkles } from "lucide-react"

export type LyricsInputProps = {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  maxLength?: number
  placeholder?: string
  readOnly?: boolean
  busy: boolean
  onGenerate: () => void
  lyricsAiEnabled: boolean
  onLyricsAiToggle: () => void
  lyricsAiToggleDisabled?: boolean
  /** When true, the main generate (audio) control is disabled. */
  generateDisabled?: boolean
}

export default function LyricsInput({
  value,
  onChange,
  maxLength = 3500,
  placeholder = "[Verse] …",
  readOnly = false,
  busy,
  onGenerate,
  lyricsAiEnabled,
  onLyricsAiToggle,
  lyricsAiToggleDisabled = false,
  generateDisabled = false,
}: LyricsInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useLayoutEffect(() => {
    adjustTextareaHeight()
  }, [value, adjustTextareaHeight])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!busy && !generateDisabled) onGenerate()
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className="border border-zinc-700 rounded-2xl p-4 relative transition-all duration-500 ease-in-out overflow-hidden"
          style={{ backgroundColor: "#141415" }}
        >
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={onChange}
              readOnly={readOnly}
              maxLength={maxLength}
              placeholder={placeholder}
              className="w-full bg-transparent text-gray-300 placeholder-gray-500 resize-none border-none outline-none text-base leading-relaxed min-h-[24px] max-h-32 transition-all duration-200 disabled:opacity-60"
              rows={1}
              onInput={adjustTextareaHeight}
            />

            <div className="flex items-center justify-between mt-8">
              <Button
                type="button"
                variant={lyricsAiEnabled ? "secondary" : "ghost"}
                size="sm"
                disabled={lyricsAiToggleDisabled}
                onClick={onLyricsAiToggle}
                aria-pressed={lyricsAiEnabled}
                aria-label={lyricsAiEnabled ? "Turn off AI lyrics" : "Generate lyrics with AI"}
                className="h-8 gap-1.5 rounded-lg px-3 text-sm font-medium transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                style={
                  lyricsAiEnabled
                    ? { backgroundColor: "#032827", color: "#2DD4BF" }
                    : { color: "white" }
                }
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                AI lyrics
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={busy || generateDisabled}
                aria-busy={busy}
                aria-label={busy ? "Generating" : "Generate audio"}
                className="h-8 w-8 p-0 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
