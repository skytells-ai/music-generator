import { cn } from "@/lib/utils"

/** Compact cloud mark for Skytells / BeatFusion chrome. */
export function SkytellsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-[18px] shrink-0 text-foreground", className)}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
      />
    </svg>
  )
}
