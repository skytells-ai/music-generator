"use client"

import Link from "next/link"
import { DebugLayoutToolbar } from "@/components/debug-layout-toolbar"
import { MusicGenerator } from "@/components/music-generator"
import { SkytellsFooter } from "@/components/skytells-footer"
import { DebugLayoutProvider } from "@/context/debug-layout-context"
import { SkytellsConfigProvider } from "@/context/skytells-config-context"
import { SkytellsConfigGate } from "@/components/skytells-config-gate"
import { SkytellsMark } from "@/components/skytells-logo"

const headerNavLinks = [
  { label: "Blog", href: "https://skytells.ai/blog" },
  { label: "Research", href: "https://skytells.ai/research" },
  { label: "Learn", href: "https://skytells.ai/learn" },
  { label: "Get Started", href: "https://skytells.ai/auth/signup" },
] as const

/**
 * AI Music Generator shell: black canvas, hairline grid, header/nav, hero frame (+ corners), main, footer.
 */
export function BeatFusionHome() {
  return (
    <DebugLayoutProvider>
    <SkytellsConfigProvider>
    <div className="bg-background relative min-h-screen">
      <div className="bg-grid-skytells pointer-events-none fixed inset-0 z-0" aria-hidden />

      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <SkytellsMark />
              <span className="text-foreground text-[15px] font-semibold tracking-tight">AI Music Generator</span>
            </Link>

            <nav
              className="text-muted-foreground absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex"
              aria-label="Main"
            >
              {headerNavLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/90 hover:bg-foreground/[0.06] rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href="https://skytells.ai/auth/login"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-foreground text-background hover:opacity-90 inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-medium transition-opacity"
              >
                Log In
              </Link>
            </div>
          </div>

          <nav
            className="border-border flex gap-1 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
            aria-label="Skytells"
          >
            {headerNavLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/90 hover:bg-foreground/[0.06] shrink-0 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="border-border relative z-10 border-b">
        <div className="skytells-hero-frame mx-auto max-w-[1248px] px-6 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
          <span className="text-muted-foreground/70 pointer-events-none absolute left-0 top-0 font-mono text-[11px] leading-none">
            +
          </span>
          <span className="text-muted-foreground/70 pointer-events-none absolute right-0 top-0 font-mono text-[11px] leading-none">
            +
          </span>
          <span className="text-muted-foreground/70 pointer-events-none absolute bottom-0 left-0 font-mono text-[11px] leading-none">
            +
          </span>
          <span className="text-muted-foreground/70 pointer-events-none absolute bottom-0 right-0 font-mono text-[11px] leading-none">
            +
          </span>

          <div className="mx-auto max-w-[720px] text-center">
            <h1 className="text-foreground mb-6 text-[clamp(2.125rem,4.8vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
              Music Without Limits.
            </h1>
            <p className="text-muted-foreground mx-auto mb-10 max-w-[540px] text-[15px] leading-[1.65] sm:text-base">
              Full tracks from lyrics and a style line. Audio is generated with the <span className="text-foreground/90">BeatFusion</span>{" "}
              model — fast, scalable, and production-ready.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="#compose"
                className="bg-foreground text-background hover:opacity-90 inline-flex h-11 items-center gap-2 rounded-full px-7 text-[14px] font-medium transition-opacity"
              >
                <SkytellsMark className="text-background size-[15px]" />
                Start generating
              </Link>
              <Link
                href="https://learn.skytells.ai/docs/sdks/ts/predictions"
                target="_blank"
                rel="noopener noreferrer"
                className="border-border text-foreground hover:bg-foreground/[0.06] inline-flex h-11 items-center rounded-full border bg-foreground/[0.03] px-7 text-[14px] font-medium transition-colors"
              >
                Get a demo
              </Link>
            </div>
          </div>

          <div className="relative mt-14 overflow-hidden sm:mt-20">
            <div className="from-chart-1 via-chart-2 to-chart-5 h-[2px] w-full bg-gradient-to-r opacity-95 blur-[0.5px]" />
            <div className="from-chart-1 via-chart-2 to-chart-5 -mt-[2px] h-[2px] w-full bg-gradient-to-r opacity-100" />
          </div>
          <p className="text-muted-foreground mt-8 text-center text-[13px] font-medium leading-relaxed sm:text-[14px]">
            <span className="text-foreground/90">Develop with Skytells</span>
            <span className="text-foreground/20 mx-2">|</span>
            <span>Launch globally, instantly</span>
            <span className="text-foreground/20 mx-2">|</span>
            <span>Keep building</span>
          </p>
        </div>
      </section>

      <main id="compose" className="border-border bg-background relative z-10 border-b">
        <div className="mx-auto max-w-[1248px] px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="bf-enter-3">
            <SkytellsConfigGate />
            <MusicGenerator />
          </div>
        </div>
      </main>

      {(process.env.NEXT_PUBLIC_DEBUG_UI === "true") && (
        <div className="mx-auto max-w-[1248px] px-6 sm:px-8 lg:px-12">
          <DebugLayoutToolbar />
        </div>
      )}
      <SkytellsFooter />
    </div>
    </SkytellsConfigProvider>
    </DebugLayoutProvider>
  )
}
