import { NextResponse } from "next/server"
import { isAllowedSkytellsAssetUrl } from "@/lib/skytells-asset-url"

export const runtime = "nodejs"

/**
 * GET ?url= — stream remote audio through this origin so `<audio>` and `fetch` work (CDN has no CORS).
 */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url")?.trim() ?? ""
  if (!url || !isAllowedSkytellsAssetUrl(url)) {
    return NextResponse.json({ error: "Invalid or disallowed URL." }, { status: 400 })
  }

  try {
    const upstream = await fetch(url, { redirect: "follow" })
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream returned ${upstream.status}.` }, { status: 502 })
    }
    const ct = upstream.headers.get("content-type") ?? "application/octet-stream"
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed."
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

/**
 * POST JSON `{ url, filename }` — proxy for **download** with `Content-Disposition: attachment`.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const o = body as Record<string, unknown>
  const url = typeof o.url === "string" ? o.url.trim() : ""
  if (!url || !isAllowedSkytellsAssetUrl(url)) {
    return NextResponse.json({ error: "Invalid or disallowed URL." }, { status: 400 })
  }

  const filename =
    typeof o.filename === "string" && /^[\w.\- ()]+$/.test(o.filename) && o.filename.length <= 200
      ? o.filename
      : "track.mp3"

  try {
    const res = await fetch(url, { redirect: "follow" })
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}.` }, { status: 502 })
    }
    const buf = await res.arrayBuffer()
    const ct = res.headers.get("content-type") ?? "application/octet-stream"
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed."
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
