import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { SkytellsMark } from "@/components/skytells-logo"

const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Get started",
    links: [
      { label: "Get Started", href: "https://skytells.ai/auth/signup" },
      { label: "API Keys", href: "https://skytells.ai/dashboard/api-keys" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Status", href: "https://status.skytells.ai" },
      { label: "Models", href: "https://skytells.ai/explore/models" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Skytells Learn", href: "https://learn.skytells.ai" },
      {
        label: "Predictions (TypeScript)",
        href: "https://learn.skytells.ai/docs/sdks/ts/predictions",
      },
    ],
  },
  {
    title: "Skytells",
    links: [
      { label: "Home", href: "https://skytells.ai" },
      { label: "Dashboard", href: "https://skytells.ai/dashboard" },
    ],
  },
]

export function SkytellsFooter() {
  return (
    <footer className="border-border border-t bg-background">
      <div className="mx-auto max-w-[1248px] px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {footerColumns.map((col) => (
            <div key={col.title} className="min-w-0">
              <h3 className="text-muted-foreground mb-4 text-[11px] font-semibold tracking-[0.14em] uppercase">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-muted-foreground inline-flex items-center gap-2 text-[13px] leading-snug transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-border mt-16 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
            <SkytellsMark className="size-3.5 shrink-0 opacity-80" />
            <span className="text-foreground font-medium">AI Music Generator</span>
            <span className="text-muted-foreground/90">· BeatFusion</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <p className="text-muted-foreground text-[12px]">© {new Date().getFullYear()} Skytells. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
