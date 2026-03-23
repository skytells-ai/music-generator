import Skytells from "skytells"
import { resolveSkytellsForRequest } from "@/lib/skytells-runtime-config"
import {
  BEATFUSION_MODEL,
  buildBeatFusionInput,
  toUserFacingError,
  validateLyrics,
  validatePrompt,
  type BeatFusionGenerateBody,
} from "@/lib/skytells-music"

export const runtime = "nodejs"
export const maxDuration = 300

function parseBody(json: unknown): { ok: true; body: BeatFusionGenerateBody } | { ok: false; error: string } {
  if (!json || typeof json !== "object") return { ok: false, error: "Body must be a JSON object." }
  const o = json as Record<string, unknown>
  const lyrics = typeof o.lyrics === "string" ? o.lyrics : ""
  const errL = validateLyrics(lyrics)
  if (errL) return { ok: false, error: errL }
  const prompt = typeof o.prompt === "string" ? o.prompt : undefined
  const errP = validatePrompt(prompt)
  if (errP) return { ok: false, error: errP }

  const rates = new Set([16000, 24000, 32000, 44100])
  const bitrates = new Set([32000, 64000, 128000, 256000])
  const formats = new Set(["mp3", "wav", "pcm"])

  let sample_rate: BeatFusionGenerateBody["sample_rate"]
  if (o.sample_rate != null) {
    const n = Number(o.sample_rate)
    if (!rates.has(n)) return { ok: false, error: "Invalid sample_rate." }
    sample_rate = n as BeatFusionGenerateBody["sample_rate"]
  }
  let bitrate: BeatFusionGenerateBody["bitrate"]
  if (o.bitrate != null) {
    const n = Number(o.bitrate)
    if (!bitrates.has(n)) return { ok: false, error: "Invalid bitrate." }
    bitrate = n as BeatFusionGenerateBody["bitrate"]
  }
  let audio_format: BeatFusionGenerateBody["audio_format"]
  if (o.audio_format != null) {
    const s = String(o.audio_format)
    if (!formats.has(s)) return { ok: false, error: "Invalid audio_format." }
    audio_format = s as BeatFusionGenerateBody["audio_format"]
  }

  return { ok: true, body: { lyrics, prompt, sample_rate, bitrate, audio_format } }
}

/**
 * Streams SSE: `init`, `prediction_started` (create with `await: false`), then closes.
 * The client polls `GET /api/prediction?id=…` every 20s until the job finishes.
 */
export async function POST(req: Request) {
  const { apiKey } = resolveSkytellsForRequest(req)
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

  const input = buildBeatFusionInput(parsed.body)
  const skytells = Skytells(apiKey, { timeout: 120_000, runtime: "node" })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      try {
        send({ type: "init", request: { model: BEATFUSION_MODEL, input } })
        const data = await skytells.predictions.create({
          model: BEATFUSION_MODEL,
          input,
          await: false,
        })
        send({
          type: "prediction_started",
          predictionId: data.id,
          prediction: data as unknown as Record<string, unknown>,
        })
      } catch (e) {
        const m = toUserFacingError(e)
        send({ type: "error", message: m.message, errorId: m.errorId, httpStatus: m.httpStatus })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
