import {
  serverImageModelDefault,
  serverLyricsModelDefault,
  serverSkytellsApiKey,
} from "@/lib/skytells-runtime-config"

export const runtime = "nodejs"

/**
 * Public bootstrap: whether the server has a key, and effective default model slugs (from env + fallbacks).
 * Never exposes secrets.
 */
export async function GET() {
  return Response.json({
    hasServerApiKey: Boolean(serverSkytellsApiKey()),
    defaults: {
      imageModel: serverImageModelDefault(),
      lyricsModel: serverLyricsModelDefault(),
    },
  })
}
