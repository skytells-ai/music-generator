import Skytells from "skytells"
import { resolveSkytellsForRequest } from "@/lib/skytells-runtime-config"
import { toUserFacingError } from "@/lib/skytells-music"

export const runtime = "nodejs"
export const maxDuration = 120

const SYSTEM = `You write song lyrics for music production. Output ONLY the lyrics text — no title line, no quotes wrapper, no explanation. Use section tags like [Verse], [Chorus], [Bridge], [Outro] when they help structure. Stay under 3500 characters. Match the mood, genre, and tempo implied by the user.`

function parseBody(json: unknown): {
  idea: string
  styleHint: string
  stream: boolean
} | { error: string } {
  if (!json || typeof json !== "object") return { error: "Body must be a JSON object." }
  const o = json as Record<string, unknown>
  const idea = typeof o.idea === "string" ? o.idea.trim() : ""
  const styleHint = typeof o.styleHint === "string" ? o.styleHint.trim() : ""
  const stream = o.stream === true

  if (!idea && !styleHint) {
    return { error: "Provide at least an idea or a style line." }
  }

  return { idea, styleHint, stream }
}

/**
 * POST /api/lyrics — Skytells chat (model from env / client header).
 * - `stream: true` → SSE (`text/event-stream`): `init`, `delta`, `done`, `error`
 * - `stream: false` or omitted → JSON `{ lyrics }` (non-streaming)
 */
export async function POST(req: Request) {
  const { apiKey, lyricsModel } = resolveSkytellsForRequest(req)
  if (!apiKey) {
    return Response.json(
      {
        error: "Skytells is not configured. Set SKYTELLS_API_KEY on the server or configure your API key in the app.",
        code: "SKYTELLS_NOT_CONFIGURED",
      },
      { status: 503 },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = parseBody(json)
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const { idea, styleHint, stream } = parsed

  const userParts = [
    styleHint && `Style / production (BPM, genre, mood): ${styleHint}`,
    idea && `Theme / what the song is about: ${idea}`,
    !idea && styleHint && "Write full lyrics that fit this style.",
  ].filter(Boolean) as string[]

  const userContent = userParts.join("\n\n")
  const skytells = Skytells(apiKey, { timeout: 120_000, runtime: "node" })

  if (!stream) {
    try {
      const completion = await skytells.chat.completions.create({
        model: lyricsModel,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        max_tokens: 2500,
        temperature: 0.85,
      })

      const raw = completion.choices[0]?.message?.content
      const text = typeof raw === "string" ? raw.trim() : ""
      if (!text) {
        return Response.json({ error: "Empty response from the model." }, { status: 502 })
      }

      const lyrics = text.length > 3500 ? text.slice(0, 3500) : text
      return Response.json({ lyrics, model: lyricsModel })
    } catch (e) {
      const m = toUserFacingError(e)
      return Response.json(
        { error: m.message, errorId: m.errorId },
        { status: typeof m.httpStatus === "number" ? m.httpStatus : 502 },
      )
    }
  }

  const encoder = new TextEncoder()
  const bodyStream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ type: "init", model: lyricsModel })
        const iterable = await skytells.chat.completions.create({
          model: lyricsModel,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userContent },
          ],
          max_tokens: 2500,
          temperature: 0.85,
          stream: true,
        })

        for await (const chunk of iterable) {
          if (req.signal.aborted) break
          const delta = chunk.choices?.[0]?.delta?.content
          if (typeof delta === "string" && delta.length > 0) {
            send({ type: "delta", text: delta })
          }
        }

        if (!req.signal.aborted) {
          send({ type: "done" })
        }
      } catch (e) {
        const m = toUserFacingError(e)
        send({ type: "error", message: m.message, errorId: m.errorId })
      } finally {
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
  })

  return new Response(bodyStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
