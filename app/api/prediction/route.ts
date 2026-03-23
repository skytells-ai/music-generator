import Skytells from "skytells"
import { resolveSkytellsForRequest } from "@/lib/skytells-runtime-config"
import { normalizeBeatFusionAudioUrl, toUserFacingError } from "@/lib/skytells-music"

export const runtime = "nodejs"

const PREDICTION_ID_RE = /^[\w-]{1,160}$/

/**
 * GET ?id=pred_… — fetch current prediction state (for client-side polling when create used `await: false`).
 */
export async function GET(req: Request) {
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

  const id = new URL(req.url).searchParams.get("id")?.trim() ?? ""
  if (!id || !PREDICTION_ID_RE.test(id)) {
    return Response.json({ error: "Invalid prediction id." }, { status: 400 })
  }

  const skytells = Skytells(apiKey, { timeout: 120_000, runtime: "node" })
  try {
    const data = await skytells.predictions.get(id)
    const audioUrl = normalizeBeatFusionAudioUrl(data.output)
    return Response.json({
      predictionId: data.id,
      status: data.status,
      output: data.output,
      audioUrl,
      raw: data,
    })
  } catch (e) {
    const m = toUserFacingError(e)
    return Response.json(
      { error: m.message, errorId: m.errorId, httpStatus: m.httpStatus },
      { status: m.httpStatus && m.httpStatus >= 400 && m.httpStatus < 600 ? m.httpStatus : 502 },
    )
  }
}
