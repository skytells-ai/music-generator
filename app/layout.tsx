import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "AI Music Generator",
  description: "Next.js template: full songs from lyrics and style, powered by the BeatFusion model (beatfusion-2.0).",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} antialiased`}
      >
        <Script id="beatfusion-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("beatfusion-theme");document.documentElement.classList.toggle("dark",t!=="light");}catch(e){}`}
        </Script>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
