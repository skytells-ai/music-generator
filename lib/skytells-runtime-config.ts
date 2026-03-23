/**
 * Resolves Skytells API key and model slugs per request:
 * - API key: `SKYTELLS_API_KEY` env, else `x-skytells-api-key` header (BYO key).
 * - Image model: header override, else `SKYTELLS_IMAGE_GENERATION_MODEL`, else `truefusion`.
 * - Lyrics model: header override, else `SKYTELLS_LYRICS_GENERATION_MODEL`, else `deepbrain-router`.
 */

export const SKYTELLS_HEADER_API_KEY = "x-skytells-api-key"
export const SKYTELLS_HEADER_IMAGE_MODEL = "x-skytells-image-model"
export const SKYTELLS_HEADER_LYRICS_MODEL = "x-skytells-lyrics-model"

export const DEFAULT_SKYTELLS_IMAGE_MODEL = "truefusion"
export const DEFAULT_SKYTELLS_LYRICS_MODEL = "deepbrain-router"

const MODEL_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/i

export function stripEnvQuotes(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const t = value.trim()
  if (t.length < 2) return t || undefined
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim() || undefined
  }
  return t || undefined
}

export function isValidSkytellsModelSlug(slug: string): boolean {
  return MODEL_RE.test(slug)
}

export function sanitizeModelSlug(slug: string | undefined, fallback: string): string {
  const t = slug?.trim() ?? ""
  if (t.length > 0 && isValidSkytellsModelSlug(t)) return t
  return fallback
}

export function serverSkytellsApiKey(): string | undefined {
  const k = process.env.SKYTELLS_API_KEY?.trim()
  return k || undefined
}

export function serverImageModelDefault(): string {
  const raw = stripEnvQuotes(process.env.SKYTELLS_IMAGE_GENERATION_MODEL)
  return sanitizeModelSlug(raw, DEFAULT_SKYTELLS_IMAGE_MODEL)
}

export function serverLyricsModelDefault(): string {
  const raw = stripEnvQuotes(process.env.SKYTELLS_LYRICS_GENERATION_MODEL)
  return sanitizeModelSlug(raw, DEFAULT_SKYTELLS_LYRICS_MODEL)
}

export type ResolvedSkytellsConfig = {
  apiKey: string | null
  imageModel: string
  lyricsModel: string
}

/**
 * Combine env + optional client headers into credentials for this request.
 */
export function resolveSkytellsForRequest(req: Request): ResolvedSkytellsConfig {
  const envKey = serverSkytellsApiKey()
  const headerKey = req.headers.get(SKYTELLS_HEADER_API_KEY)?.trim()
  const apiKey = envKey || headerKey || null

  const baseImage = serverImageModelDefault()
  const baseLyrics = serverLyricsModelDefault()

  const imageModel = sanitizeModelSlug(req.headers.get(SKYTELLS_HEADER_IMAGE_MODEL) ?? undefined, baseImage)
  const lyricsModel = sanitizeModelSlug(req.headers.get(SKYTELLS_HEADER_LYRICS_MODEL) ?? undefined, baseLyrics)

  return { apiKey, imageModel, lyricsModel }
}
