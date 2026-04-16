# AI Music Generator

<p align="center">
  <a href="https://github.com/skytells-ai/music-generator"><strong>Repository</strong></a>
  ·
  <a href="https://github.com/skytells-ai/music-generator/issues"><strong>Issues</strong></a>
  ·
  <a href="https://learn.skytells.ai"><strong>Skytells Learn</strong></a>
</p>

<p align="center">
  <a href="https://github.com/skytells-ai/music-generator">
    <img
      src="https://raw.githubusercontent.com/skytells-ai/music-generator/main/public/beatfusion.jpg"
      alt="AI Music Generator — lyrics to full song via the BeatFusion model"
      width="920"
    />
  </a>
</p>

A **production-ready Next.js** app from **[skytells-ai/music-generator](https://github.com/skytells-ai/music-generator)** for **lyrics → full song** workflows: stream long-running audio jobs, surface progress in the UI, and hand users a real download—without rebuilding prediction polling, SSE plumbing, or proxy logic from scratch.

**Audio generation** prompts the **[BeatFusion](https://skytells.ai/models/beatfusion)** music model (slug **`beatfusion-2.0`**): vocals, arrangement, and export-ready **MP3 / WAV / PCM** from lyrics plus an optional style line.

**What else ships**

- **Streaming first** — server-sent events for generation progress; same patterns extend to other long-horizon inference jobs.
- **Lyrics assist** — chat-completions flow for drafting or refining lyrics (streaming or JSON).
- **Cover art** — image prediction from lyrics/style or a custom prompt, with aspect ratio control.
- **Download helper** — server proxy so the browser can save remote audio with a filename (avoids common CORS pitfalls).

Image and chat routes use the same official TypeScript SDK shape as BeatFusion—**one client** for predictions and chat. Browse more model slugs in the [model catalog](https://skytells.ai/explore/models); API reference on [Learn](https://learn.skytells.ai).

---

## Project layout

| Area | Role |
|------|------|
| [`app/api/generate`](./docs/ROUTES.md#post-apigenerate) | Prompt **BeatFusion** (`beatfusion-2.0`) with `run()` + SSE progress + completion payload |
| [`app/api/lyrics`](./docs/ROUTES.md#post-apilyrics) | Chat-based lyrics (optional SSE) |
| [`app/api/cover`](./docs/ROUTES.md#post-apicover) | Cover image prediction |
| [`app/api/download-audio`](./docs/ROUTES.md#post-apidownload-audio) | Allowed-host proxy for `Content-Disposition` downloads |
| [`lib/skytells-music.ts`](./lib/skytells-music.ts) | BeatFusion slug, input builder, validation helpers |

Full request/response details: **[Routes & API reference](./docs/ROUTES.md)**.

---

## TypeScript SDK

```bash
npm i skytells
```

This app calls `Skytells()`, `run()` for BeatFusion audio and cover images, `chat.completions` for lyrics, and `predictions.list` for optional key checks. See [Predictions (TypeScript)](https://learn.skytells.ai/docs/sdks/ts/predictions).

---

## Configuration

Inference is gated on an API key—**do not commit secrets**; use environment variables or your host’s secret store.

1. Create a key in the [dashboard](https://skytells.ai/dashboard/api-keys).  
2. Set `SKYTELLS_API_KEY` in `.env` (see [`.env.example`](./.env.example)), or use the dev UI / `x-skytells-api-key` header as documented in [Routes](./docs/ROUTES.md).

Authentication for raw HTTP uses the `x-api-key` header; the SDK applies it when you construct the client with your key. Details: [Authentication](https://learn.skytells.ai/docs/api/authentication).

---

## Quick start

```bash
git clone https://github.com/skytells-ai/music-generator.git
cd music-generator
npm install
cp .env.example .env
# Set SKYTELLS_API_KEY for server-side calls (or use BYO key in the UI for local dev only)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For production, keep keys **server-side** only.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Typecheck (`tsc --noEmit`) |

## Stack

- Next.js (App Router), React 19, TypeScript  
- [`skytells`](https://www.npmjs.com/package/skytells) — `run`, `chat.completions`, `predictions`  
- Tailwind CSS v4, Radix UI primitives

## License

[MIT](./LICENSE)
