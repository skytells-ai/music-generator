"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "beatfusion-theme"

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const nextDark = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", nextDark)
    try {
      localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light")
    } catch {
      /* ignore */
    }
    setDark(nextDark)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors",
        "hover:bg-foreground/6",
        className,
      )}
    >
      {dark ? <Sun className="size-[15px] stroke-[1.5]" /> : <Moon className="size-[15px] stroke-[1.5]" />}
    </button>
  )
}
