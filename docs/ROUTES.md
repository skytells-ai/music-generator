# Routes reference

Source: **[github.com/skytells-ai/music-generator](https://github.com/skytells-ai/music-generator)**.

This app is the **AI Music Generator** project on **Next.js App Router**: full-track audio via the **BeatFusion** model (`beatfusion-2.0`), plus chat-based lyrics and image cover art, using the official [`skytells`](https://www.npmjs.com/package/skytells) TypeScript SDK.

---

## App (pages)

| Path | Description |
|------|-------------|
| `/` | **AI Music Generator** — marketing shell, API key gate, and main composer UI (`BeatFusionHome`). |

There are no other user-facing routes in `app/` today. All generation flows call the API routes below from the client.

---

## API routes

**Base URL:** same origin as the app (e.g. `http://localhost:3000` in development).

**Runtime:** all handlers use `export const runtime = "nodejs"` unless noted.

### Skytells credentials (server + optional headers)

Most generation routes resolve credentials with `resolveSkytellsForRequest` ([`lib/skytells-runtime-config.ts`](../lib/skytells-runtime-config.ts)):

1. **API key:** `SKYTELLS_API_KEY` in the environment, **or** the request header `x-skytells-api-key` (bring-your-own key from the browser). If neither is set, those routes return **503** with `code: "SKYTELLS_NOT_CONFIGURED"`.
2. **Image model** (cover art): header `x-skytells-image-model` overrides `SKYTELLS_IMAGE_GENERATION_MODEL` (default `truefusion`).
3. **Lyrics model** (chat): header `x-skytells-lyrics-model` overrides `SKYTELLS_LYRICS_GENERATION_MODEL` (default `deepbrain-router`).

Model slugs must match `[a-z0-9][a-z0-9._-]{0,127}` (case-insensitive). See the [models catalog](https://learn.skytells.ai/docs/api/v1/models/catalog).

---

### `GET /api/skytells/config`

**Purpose:** Public bootstrap for the UI — no secrets.

**Response** `200` — JSON:

```json
{
  "hasServerApiKey": true,
  "defaults": {
    "imageModel": "truefusion",
    "lyricsModel": "deepbrain-router"
  }
}
```

- `hasServerApiKey`: whether `SKYTELLS_API_KEY` is set on the server (users can still use a client key via the gate).
- `defaults`: effective default model slugs after env + sanitization.

**`maxDuration`:** not set (quick response).

---

### `POST /api/skytells/validate-key`

**Purpose:** Check that a Skytells API key works by calling `client.predictions.list({ page: 1 })`.

**`maxDuration`:** `30` seconds.

**Body** — JSON:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | yes | Skytells API key to validate. |

**Responses:**

| Status | Body |
|--------|------|
| `200` | `{ "valid": true, "predictionCount": number }` — empty list still means valid. |
| `400` | `{ "valid": false, "error": string }` — missing/invalid JSON or empty `apiKey`. |
| `502` | `{ "valid": false, "error": string }` — unexpected list shape. |
| `200` (invalid key) | `{ "valid": false, "error": string, "errorId"?: string }` — SDK/network error mapped for display. |

This route does **not** use `SKYTELLS_API_KEY` or `x-skytells-api-key`; it only validates the key sent in the body.

---

### `POST /api/lyrics`

**Purpose:** Generate song lyrics with **Skytells Chat** (`skytells.chat.completions.create`), using the resolved lyrics model.

**`maxDuration`:** `120` seconds.

**Headers (optional):** `x-skytells-api-key`, `x-skytells-lyrics-model`.

**Body** — JSON:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idea` | string | no* | Theme / what the song is about. |
| `styleHint` | string | no* | Style / production (BPM, genre, mood). |
| `stream` | boolean | no | If `true`, response is **SSE** instead of JSON. |

\* At least one of `idea` or `styleHint` must be non-empty after trim.

**Non-streaming** (`stream` omitted or `false`):

- **Response** `200`: `{ "lyrics": string, "model": string }` — lyrics capped at 3500 characters.
- **Errors:** `400` validation, `503` not configured, `502` empty model response or SDK error (`error`, optional `errorId`).

**Streaming** (`stream: true`):

- **Content-Type:** `text/event-stream; charset=utf-8`
- **SSE events** (each line `data: <json>\n\n`):

| `type` | Payload |
|--------|---------|
| `init` | `{ "type": "init", "model": string }` |
| `delta` | `{ "type": "delta", "text": string }` |
| `done` | `{ "type": "done" }` |
| `error` | `{ "type": "error", "message": string, "errorId"?: string }` |

---

### `POST /api/cover`

**Purpose:** Generate album cover art with **`client.run(imageModel, …)`** (default image model: TrueFusion-style slug from env).

**`maxDuration`:** `300` seconds.

**Headers (optional):** `x-skytells-api-key`, `x-skytells-image-model`.

**Body** — JSON (two modes):

**A) Custom prompt**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | yes | Custom cover prompt (validated; max 4000 chars). |
| `aspect_ratio` | string | no | One of: `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`. Default `1:1`. |

**B) From lyrics + style**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lyrics` | string | no | Used to derive a short thematic excerpt (max 3500 chars stored). |
| `style` | string | no* | Style/mood line (optional prompt validation, max 2000 chars if provided). |
| `aspect_ratio` | string | no | Same as above. |

\* Must provide a non-empty custom `prompt`, **or** at least one of `lyrics` / `style` after trim (see server validation messages).

**Prediction input** (SDK): `prompt`, `aspect_ratio`, `number_of_images: 1`, `prompt_optimizer: true`. Polling: `maxWait` 15 minutes, `interval` 4s.

**Response** `200`:

```json
{
  "imageUrl": "https://...",
  "predictionId": "...",
  "status": "..."
}
```

**Errors:** `400` validation, `503` not configured, `502` missing image URL or SDK error.

---

### `POST /api/generate`

**Purpose:** Run **BeatFusion 2.0** (`beatfusion-2.0`) via `skytells.run` with streaming progress. Builds input with [`buildBeatFusionInput`](../lib/skytells-music.ts).

**`maxDuration`:** `300` seconds.

**Headers (optional):** `x-skytells-api-key` (image/lyrics model headers are accepted but **not** used — audio model is fixed).

**Body** — JSON:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lyrics` | string | yes | Trimmed length 1–3500 characters. |
| `prompt` | string | no | Style / production line; max 2000 characters if provided. |
| `sample_rate` | number | no | `16000` \| `24000` \| `32000` \| `44100`. Default `44100`. |
| `bitrate` | number | no | `32000` \| `64000` \| `128000` \| `256000`. Default `256000`. |
| `audio_format` | string | no | `mp3` \| `wav` \| `pcm`. Default `mp3`. |

**Response:** **SSE only** (`text/event-stream`).

**SSE events:**

| `type` | Payload |
|--------|---------|
| `init` | `{ "type": "init", "request": { "model": "beatfusion-2.0", "input": { ... } } }` |
| `progress` | `{ "type": "progress", "prediction": <PredictionResponse> }` — emitted on each poll. |
| `complete` | `{ "type": "complete", "predictionId", "status", "output", "outputsNormalized", "audioUrl", "raw" }` |
| `error` | `{ "type": "error", "message", "errorId"?, "httpStatus"? }` |

`maxWait` for the run is 20 minutes; poll `interval` 4s.

**Errors:** `400` validation (JSON body), `503` not configured.

---

### `POST /api/download-audio`

**Purpose:** **Proxy** a remote audio URL so the browser can download with a filename (avoids CORS issues with `<a download>` on cross-origin URLs).

**Security:** only HTTPS URLs whose hostname is allowed:

- contains `skytells`, or  
- ends with `.r2.dev` or `.cloudflarestorage.com`

**Body** — JSON:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Remote asset URL (must pass allowlist). |
| `filename` | string | no | Safe filename: `[\w.\- ()]+`, max 200 chars. Default `track.mp3`. |

**Success** `200`: raw bytes with `Content-Type` from upstream (or `application/octet-stream`) and `Content-Disposition: attachment`.

**Errors:** `400` invalid JSON, bad URL, or disallowed host; `502` upstream non-OK or fetch failure — JSON `{ "error": string }`.

---

## Environment variables

See [`.env.example`](../.env.example) for copy-paste templates.

| Variable | Scope | Description |
|----------|--------|-------------|
| `SKYTELLS_API_KEY` | server | Default API key for server-side calls (optional if every client sends `x-skytells-api-key`). |
| `SKYTELLS_IMAGE_GENERATION_MODEL` | server | Default image / cover model slug. |
| `SKYTELLS_LYRICS_GENERATION_MODEL` | server | Default chat model for `/api/lyrics`. |
| `NEXT_PUBLIC_DEBUG_UI` | client | When `true`, shows extra layout debug tooling in the UI. |

---

## Further reading

- [Skytells Learn](https://learn.skytells.ai) — API & SDK docs  
- [Predictions (TypeScript)](https://learn.skytells.ai/docs/sdks/ts/predictions) — `run`, wait, outputs  
- [Chat completions](https://learn.skytells.ai/docs/sdks/ts/chat) — lyrics route  
- [Models catalog](https://learn.skytells.ai/docs/api/v1/models/catalog) — slugs and schemas  
- BeatFusion model constant: `BEATFUSION_MODEL` in [`lib/skytells-music.ts`](../lib/skytells-music.ts)
