/**
 * Helpers for **BeatFusion 2.0** (`beatfusion-2.0`) in this repo.
 *
 * @see {@link https://learn.skytells.ai/docs/sdks/ts/predictions | Predictions API (TypeScript SDK)}
 * @see {@link https://api.skytells.ai/v1/models/beatfusion-2.0?fields=input_schema,output_schema | Model schema}
 */
import { SkytellsError } from "skytells"

/** Model slug passed to `SkytellsClient.prototype.run`. */
export const BEATFUSION_MODEL = "beatfusion-2.0" as const

/** Text-to-image cover art (`client.run`). */
export const TRUEFUSION_MODEL = "truefusion" as const

/** Chat model for lyrics ideation (`client.chat.completions.create`). */
export const LYRICS_CHAT_MODEL = "deepbrain-router" as const

export type BeatFusionAudioFormat = "mp3" | "wav" | "pcm"
export type BeatFusionSampleRate = 16000 | 24000 | 32000 | 44100
export type BeatFusionBitrate = 32000 | 64000 | 128000 | 256000

/** Client JSON body for `POST /api/generate` (mirrors prediction `input`). */
export interface BeatFusionGenerateBody {
  lyrics: string
  prompt?: string
  sample_rate?: BeatFusionSampleRate
  bitrate?: BeatFusionBitrate
  audio_format?: BeatFusionAudioFormat
}

/**
 * Builds the `input` object for BeatFusion from a validated body (applies schema defaults).
 */
export function buildBeatFusionInput(body: BeatFusionGenerateBody): Record<string, unknown> {
  return {
    lyrics: body.lyrics,
    prompt: body.prompt ?? "",
    sample_rate: body.sample_rate ?? 44100,
    bitrate: body.bitrate ?? 256000,
    audio_format: body.audio_format ?? "mp3",
  }
}

/** Normalizes prediction `output` to a single playable URL when BeatFusion returns string or one-element array. */
export function normalizeBeatFusionAudioUrl(output: string | string[] | undefined | null): string | undefined {
  if (output == null) return undefined
  if (typeof output === "string") return output
  if (Array.isArray(output) && output.length > 0) return output[0]
  return undefined
}

/** Returns a validation message or `null` if lyrics satisfy the API (1–3500 chars, required). */
export function validateLyrics(lyrics: string): string | null {
  const t = lyrics.trim()
  if (!t) return "Lyrics are required."
  if (t.length > 3500) return "Lyrics must be at most 3500 characters."
  return null
}

/** Validates optional style prompt (0–2000 characters). */
export function validatePrompt(prompt: string | undefined): string | null {
  if (prompt == null || prompt === "") return null
  if (prompt.length > 2000) return "Style prompt must be at most 2000 characters."
  return null
}

/** Cover art custom prompt (TrueFusion). */
export function validateCoverPrompt(prompt: string): string | null {
  const t = prompt.trim()
  if (!t) return "Cover prompt is required when provided."
  if (t.length > 4000) return "Cover prompt must be at most 4000 characters."
  return null
}

/**
 * Maps SDK/network errors to short, user-facing copy for toasts and UI.
 */
export function toUserFacingError(err: unknown): { message: string; errorId?: string; httpStatus?: number } {
  if (err instanceof SkytellsError) {
    const id = err.errorId
    switch (id) {
      case "INSUFFICIENT_CREDITS":
        return { message: "Not enough credits. Add credits in your Skytells account.", errorId: id }
      case "RATE_LIMIT_EXCEEDED":
      case "RATE_LIMITED":
      case "INFERENCE_RATE_LIMITED":
        return { message: "Rate limited. Wait a moment and try again.", errorId: id }
      case "UNAUTHORIZED":
        return { message: "API key missing or invalid on the server.", errorId: id, httpStatus: 401 }
      case "INVALID_INPUT":
      case "INVALID_PARAMETER":
        return { message: err.message || "Invalid input. Check lyrics and options.", errorId: id }
      case "WAIT_TIMEOUT":
        return { message: "Generation exceeded the time limit. Try shorter lyrics or retry.", errorId: id }
      case "INFERENCE_TIMEOUT":
        return { message: "The model timed out. Try again.", errorId: id }
      case "CONTENT_POLICY_VIOLATION":
        return { message: "Content was blocked by policy. Adjust lyrics or style.", errorId: id }
      case "SERVICE_UNAVAILABLE":
        return { message: "Service temporarily unavailable. Try again shortly.", errorId: id }
      case "PREDICTION_FAILED":
        return {
          message: typeof err.details === "string" ? err.details : err.message || "Prediction failed.",
          errorId: id,
        }
      default:
        return { message: err.message || "Something went wrong.", errorId: id, httpStatus: err.httpStatus }
    }
  }
  if (err instanceof Error) return { message: err.message }
  return { message: "An unexpected error occurred." }
}
