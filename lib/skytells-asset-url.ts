/**
 * Remote URLs we allow the app server to fetch (Skytells outputs / R2-style delivery).
 */
export function isAllowedSkytellsAssetUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== "https:") return false
    const h = u.hostname.toLowerCase()
    if (h.includes("skytells")) return true
    if (h.endsWith(".r2.dev") || h.endsWith(".cloudflarestorage.com")) return true
    return false
  } catch {
    return false
  }
}

/**
 * Same-origin URL that proxies the remote file — use for `<audio>` and `fetch` so the browser avoids CDN CORS.
 */
export function proxiedPlaybackUrl(remoteUrl: string): string {
  if (!remoteUrl) return remoteUrl
  if (remoteUrl.startsWith("blob:") || remoteUrl.startsWith("data:")) return remoteUrl
  if (remoteUrl.startsWith("/")) return remoteUrl
  if (!remoteUrl.startsWith("https://")) return remoteUrl
  if (!isAllowedSkytellsAssetUrl(remoteUrl)) return remoteUrl
  return `/api/download-audio?url=${encodeURIComponent(remoteUrl)}`
}
