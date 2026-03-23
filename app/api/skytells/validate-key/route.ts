import Skytells from "skytells"
import { toUserFacingError } from "@/lib/skytells-music"

export const runtime = "nodejs"
export const maxDuration = 30

type Body = { apiKey?: string }

/**
 * Validates a Skytells API key by listing predictions (page 1).
 * On success, `{ valid: true, predictionCount }` — empty list still counts as valid.
 */
export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ valid: false as const, error: "Invalid JSON body." }, { status: 400 })
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
  if (!apiKey) {
    return Response.json({ valid: false as const, error: "apiKey is required." }, { status: 400 })
  }

  const client = Skytells(apiKey, { timeout: 20_000, runtime: "node" })

  try {
    const { data } = await client.predictions.list({ page: 1 })
    if (!Array.isArray(data)) {
      return Response.json(
        { valid: false as const, error: "Unexpected response when listing predictions." },
        { status: 502 },
      )
    }
    return Response.json({
      valid: true as const,
      predictionCount: data.length,
    })
  } catch (e) {
    const m = toUserFacingError(e)
    return Response.json({
      valid: false as const,
      error: m.message,
      errorId: m.errorId,
    })
  }
}
