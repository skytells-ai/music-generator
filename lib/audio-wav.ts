/**
 * Encode mono Float32 PCM (-1..1) as 16-bit WAV for blob URLs (e.g. simulation demo).
 */
export function encodeWavMono(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const n = samples.length
  const buf = new ArrayBuffer(44 + n * 2)
  const view = new DataView(buf)
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, "RIFF")
  view.setUint32(4, 36 + n * 2, true)
  writeStr(8, "WAVE")
  writeStr(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, "data")
  view.setUint32(40, n * 2, true)
  let off = 44
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return buf
}

/** Short demo clip with decaying harmonics — good for waveform preview in simulate mode. */
export function createDemoWavObjectUrl(): string {
  const sr = 44100
  const dur = 2.5
  const len = Math.floor(sr * dur)
  const f32 = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    const env = Math.exp(-t * 0.55)
    f32[i] =
      env *
      (0.22 * Math.sin(t * 440 * 2 * Math.PI) +
        0.12 * Math.sin(t * 880 * 2 * Math.PI) +
        0.06 * Math.sin(t * 1320 * 2 * Math.PI) +
        0.04 * Math.sin(t * 220 * 2 * Math.PI))
  }
  const ab = encodeWavMono(f32, sr)
  const blob = new Blob([ab], { type: "audio/wav" })
  return URL.createObjectURL(blob)
}
