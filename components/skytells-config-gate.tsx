"use client"

import { useEffect, useId, useState } from "react"
import Link from "next/link"
import { KeyRound, Loader2, Sparkles } from "lucide-react"
import { useSkytellsConfig } from "@/context/skytells-config-context"
import { isValidSkytellsModelSlug } from "@/lib/skytells-runtime-config"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Prominent missing-config alert, modal for API key + model overrides, and registration for `openSettings()`.
 */
export function SkytellsConfigGate() {
  const {
    loaded,
    hasServerApiKey,
    serverDefaults,
    client,
    setClient,
    canUseSkytells,
    registerOpenSettings,
  } = useSkytellsConfig()

  const [open, setOpen] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState("")
  const [imageDraft, setImageDraft] = useState("")
  const [lyricsDraft, setLyricsDraft] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const apiKeyFieldId = useId()
  const imageFieldId = useId()
  const lyricsFieldId = useId()

  useEffect(() => {
    registerOpenSettings(() => setOpen(true))
  }, [registerOpenSettings])

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setApiKeyDraft("")
    setImageDraft(client.imageModel?.trim() || serverDefaults.imageModel)
    setLyricsDraft(client.lyricsModel?.trim() || serverDefaults.lyricsModel)
  }, [open, client.imageModel, client.lyricsModel, serverDefaults.imageModel, serverDefaults.lyricsModel])

  const onSave = async () => {
    setFormError(null)
    if (!isValidSkytellsModelSlug(imageDraft.trim())) {
      setFormError("Image model slug looks invalid. Use letters, numbers, dots, and hyphens.")
      return
    }
    if (!isValidSkytellsModelSlug(lyricsDraft.trim())) {
      setFormError("Lyrics model slug looks invalid.")
      return
    }

    const next: typeof client = { ...client }

    if (hasServerApiKey) {
      delete next.apiKey
    } else {
      const draftKey = apiKeyDraft.trim()
      const storedKey = client.apiKey?.trim() ?? ""
      const keyToPersist = draftKey || storedKey
      if (!keyToPersist) {
        setFormError("Add your Skytells API key, or set SKYTELLS_API_KEY on the server.")
        return
      }
      const shouldValidateKey = draftKey.length > 0
      if (shouldValidateKey) {
        setValidating(true)
        try {
          const res = await fetch("/api/skytells/validate-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: draftKey }),
          })
          const j = (await res.json()) as {
            valid?: boolean
            error?: string
            predictionCount?: number
          }
          if (!j.valid) {
            setFormError(j.error ?? "Could not validate this API key.")
            return
          }
        } catch {
          setFormError("Network error while validating the API key. Try again.")
          return
        } finally {
          setValidating(false)
        }
      }
      if (draftKey) next.apiKey = draftKey
    }

    const im = imageDraft.trim()
    const lm = lyricsDraft.trim()
    if (im === serverDefaults.imageModel) delete next.imageModel
    else next.imageModel = im
    if (lm === serverDefaults.lyricsModel) delete next.lyricsModel
    else next.lyricsModel = lm

    setClient(next)
    setOpen(false)
  }

  const showBlockingBanner = loaded && !canUseSkytells

  return (
    <>
      {showBlockingBanner && (
        <div
          className={cn(
            "bf-skytells-banner group relative mb-10 overflow-hidden rounded-xl border border-transparent p-[1px]",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_50px_-24px_rgba(99,102,241,0.45)]",
          )}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.72 0.16 162), oklch(0.68 0.2 303)) border-box",
          }}
        >
          <div
            className={cn(
              "relative flex flex-col gap-4 rounded-[11px] border border-white/10 bg-black/92 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
              "backdrop-blur-md",
            )}
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.2_264/0.35),transparent_65%)]"
              aria-hidden
            />
            <div className="relative flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/25 to-cyan-400/20 ring-1 ring-white/15">
                <Sparkles className="size-5 text-indigo-200" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 space-y-1.5">
                <h3 className="text-foreground text-base font-semibold tracking-tight">
                  Connect Skytells to generate
                </h3>
                <p className="text-muted-foreground max-w-xl text-[13px] leading-relaxed sm:text-sm">
                  No server API key was found. Add your key and optional model overrides here, or set{" "}
                  <code className="text-foreground/90 rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">
                    SKYTELLS_API_KEY
                  </code>{" "}
                  (and model env vars) in{" "}
                  <code className="text-foreground/90 rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">
                    .env
                  </code>
                  .
                </p>
                <p className="text-muted-foreground pt-1 text-[12px]">
                  <Link
                    href="https://skytells.ai/dashboard/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/90 underline decoration-white/25 underline-offset-2 transition-colors hover:decoration-white/50"
                  >
                    Get an API key
                  </Link>
                  <span className="text-foreground/25 mx-2">·</span>
                  <Link
                    href="https://skytells.ai/explore/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/90 underline decoration-white/25 underline-offset-2 transition-colors hover:decoration-white/50"
                  >
                    Browse models
                  </Link>
                </p>
              </div>
            </div>
            <div className="relative flex shrink-0 flex-col gap-2 sm:items-end">
              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="h-10 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500/95 hover:to-cyan-500/95"
              >
                <KeyRound className="size-4 opacity-90" />
                Configure now
              </Button>
              <span className="text-muted-foreground text-center text-[11px] sm:text-right">
                Stored in this browser only
              </span>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/80 max-w-md gap-6 bg-zinc-950 text-zinc-50 sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Skytells configuration</DialogTitle>
            <DialogDescription className="text-zinc-400 text-[13px] leading-relaxed">
              {hasServerApiKey
                ? "The server already has an API key. You can override image and lyrics models for this browser."
                : "Paste your API key to call Skytells from this device. New or replaced keys are verified by listing your predictions before save. Keys stay in local storage — use server env for production."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            {!hasServerApiKey && (
              <div className="space-y-2">
                <Label htmlFor={apiKeyFieldId} className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
                  API key
                </Label>
                <input
                  id={apiKeyFieldId}
                  type="password"
                  autoComplete="off"
                  placeholder={client.apiKey ? "Enter new key to replace stored key" : "sk-…"}
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  className="border-input bg-background/50 focus-visible:ring-ring placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
                />
                {client.apiKey && !apiKeyDraft && (
                  <p className="text-muted-foreground text-[11px]">A key is already saved. Leave blank to keep it.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={imageFieldId} className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
                Image model
              </Label>
              <input
                id={imageFieldId}
                type="text"
                autoComplete="off"
                value={imageDraft}
                onChange={(e) => setImageDraft(e.target.value)}
                className="border-input bg-background/50 focus-visible:ring-ring placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
              />
              <p className="text-muted-foreground text-[11px]">
                Server default:{" "}
                <span className="text-foreground/80 font-mono">{serverDefaults.imageModel}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={lyricsFieldId} className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
                Lyrics model
              </Label>
              <input
                id={lyricsFieldId}
                type="text"
                autoComplete="off"
                value={lyricsDraft}
                onChange={(e) => setLyricsDraft(e.target.value)}
                className="border-input bg-background/50 focus-visible:ring-ring placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
              />
              <p className="text-muted-foreground text-[11px]">
                Server default:{" "}
                <span className="text-foreground/80 font-mono">{serverDefaults.lyricsModel}</span>
              </p>
            </div>

            {formError && (
              <p className="text-destructive text-[13px]" role="alert">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-full"
              disabled={validating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onSave()}
              disabled={validating}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-500/95 hover:to-cyan-500/95"
            >
              {validating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying key…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
