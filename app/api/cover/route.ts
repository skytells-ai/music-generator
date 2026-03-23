import Skytells from "skytells"
import { resolveSkytellsForRequest } from "@/lib/skytells-runtime-config"
import { toUserFacingError, validateCoverPrompt, validatePrompt } from "@/lib/skytells-music"

export const runtime = "nodejs"
export const maxDuration = 300

type Aspect = "1:1" | "16:9" | "4:3" | "3:2" | "2:3" | "3:4" | "9:16" | "21:9"

function parseBody(json: unknown):
  | { ok: true; prompt: string; aspect_ratio: Aspect }
  | { ok: false; error: string } {
  if (!json || typeof json !== "object") return { ok: false, error: "Body must be a JSON object." }
  const o = json as Record<string, unknown>

  const custom = typeof o.prompt === "string" ? o.prompt.trim() : ""
  if (custom) {
    const err = validateCoverPrompt(custom)
    if (err) return { ok: false, error: err }
    const ar = (typeof o.aspect_ratio === "string" ? o.aspect_ratio : "1:1") as Aspect
    const allowed: Aspect[] = ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"]
    if (!allowed.includes(ar)) return { ok: false, error: "Invalid aspect_ratio." }
    return { ok: true, prompt: custom, aspect_ratio: ar }
  }

  const lyrics = typeof o.lyrics === "string" ? o.lyrics : ""
  const style = typeof o.style === "string" ? o.style : ""
  const errP = validatePrompt(style)
  if (errP) return { ok: false, error: errP }

  const lyricsTrim = lyrics.trim()
  if (lyricsTrim.length > 3500) return { ok: false, error: "Lyrics must be at most 3500 characters." }
  if (!lyricsTrim && !style.trim()) {
    return { ok: false, error: "Add a style line, lyrics, or a custom cover prompt." }
  }

  const ar = (typeof o.aspect_ratio === "string" ? o.aspect_ratio : "1:1") as Aspect
  const allowed: Aspect[] = ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"]
  if (!allowed.includes(ar)) return { ok: false, error: "Invalid aspect_ratio." }

  const excerpt = lyricsTrim
    ? lyricsTrim
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(0, 5)
        .join(" ")
        .slice(0, 600)
    : ""
  const styleBit = style.trim().slice(0, 500)
  const prompt = excerpt
    ? `Album cover art for a music track. Style and mood: ${styleBit}. Themes from the lyrics: ${excerpt}. Cinematic, high quality, visually striking, no legible text or logos.`
    : `Album cover art for a music track. Style and mood: ${styleBit}. Cinematic, high quality, visually striking, no legible text or logos.`

  return { ok: true, prompt, aspect_ratio: ar }
}

export async function POST(req: Request) {
  const { apiKey, imageModel } = resolveSkytellsForRequest(req)
  if (!apiKey) {
    return Response.json(
      {
        error: "Skytells is not configured. Set SKYTELLS_API_KEY on the server or configure your API key in the app.",
        code: "SKYTELLS_NOT_CONFIGURED",
      },
      { status: 503 },
    )
  }

  let parsed: ReturnType<typeof parseBody>
  try {
    parsed = parseBody(await req.json())
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })

  const skytells = Skytells(apiKey, { timeout: 120_000, runtime: "node" })

  try {
    const prediction = await skytells.run(
      imageModel,
      {
        input: {
          prompt: parsed.prompt,
          aspect_ratio: parsed.aspect_ratio,
          number_of_images: 1,
          prompt_optimizer: true,
        },
        maxWait: 15 * 60 * 1000,
        interval: 4000,
      },
    )
    const out = prediction.outputs()
    const imageUrl =
      typeof out === "string" ? out : Array.isArray(out) ? out[0] : undefined
    if (!imageUrl || typeof imageUrl !== "string") {
      return Response.json({ error: "No image URL in model output." }, { status: 502 })
    }
    return Response.json({
      imageUrl,
      predictionId: prediction.id,
      status: prediction.status,
    })
  } catch (e) {
    const m = toUserFacingError(e)
    return Response.json(
      { error: m.message, errorId: m.errorId, httpStatus: m.httpStatus },
      { status: m.httpStatus && m.httpStatus >= 400 && m.httpStatus < 600 ? m.httpStatus : 502 },
    )
  }
}
