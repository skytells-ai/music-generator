export interface ColorValue {
  token: string
  hex: string
  oklch: string | null
  hsla: string | null
}

export const colorData: Record<string, ColorValue> = {
  // Backgrounds
  "var(--ds-background-100)": {
    token: "var(--ds-background-100)",
    hex: "#ffffff",
    oklch: null,
    hsla: "hsl(0, 0%, 100%)",
  },
  "var(--ds-background-200)": {
    token: "var(--ds-background-200)",
    hex: "#fafafa",
    oklch: null,
    hsla: "hsl(0, 0%, 98%)",
  },

  // Gray
  "var(--ds-gray-100)": {
    token: "var(--ds-gray-100)",
    hex: "#f2f2f2",
    oklch: null,
    hsla: "hsl(0, 0%, 95%)",
  },
  "var(--ds-gray-200)": {
    token: "var(--ds-gray-200)",
    hex: "#ebebeb",
    oklch: null,
    hsla: "hsl(0, 0%, 92%)",
  },
  "var(--ds-gray-300)": {
    token: "var(--ds-gray-300)",
    hex: "#e6e6e6",
    oklch: null,
    hsla: "hsl(0, 0%, 90%)",
  },
  "var(--ds-gray-400)": {
    token: "var(--ds-gray-400)",
    hex: "#ebebeb",
    oklch: null,
    hsla: "hsl(0, 0%, 92%)",
  },
  "var(--ds-gray-500)": {
    token: "var(--ds-gray-500)",
    hex: "#c9c9c9",
    oklch: null,
    hsla: "hsl(0, 0%, 79%)",
  },
  "var(--ds-gray-600)": {
    token: "var(--ds-gray-600)",
    hex: "#a8a8a8",
    oklch: null,
    hsla: "hsl(0, 0%, 66%)",
  },
  "var(--ds-gray-700)": {
    token: "var(--ds-gray-700)",
    hex: "#8f8f8f",
    oklch: null,
    hsla: "hsl(0, 0%, 56%)",
  },
  "var(--ds-gray-800)": {
    token: "var(--ds-gray-800)",
    hex: "#7d7d7d",
    oklch: null,
    hsla: "hsl(0, 0%, 49%)",
  },
  "var(--ds-gray-900)": {
    token: "var(--ds-gray-900)",
    hex: "#666666",
    oklch: null,
    hsla: "hsl(0, 0%, 40%)",
  },
  "var(--ds-gray-1000)": {
    token: "var(--ds-gray-1000)",
    hex: "#171717",
    oklch: null,
    hsla: "hsl(0, 0%, 9%)",
  },

  // Gray Alpha
  "var(--ds-gray-alpha-100)": {
    token: "var(--ds-gray-alpha-100)",
    hex: "#0000000d",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.05)",
  },
  "var(--ds-gray-alpha-200)": {
    token: "var(--ds-gray-alpha-200)",
    hex: "#0000001a",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.1)",
  },
  "var(--ds-gray-alpha-300)": {
    token: "var(--ds-gray-alpha-300)",
    hex: "#00000026",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.15)",
  },
  "var(--ds-gray-alpha-400)": {
    token: "var(--ds-gray-alpha-400)",
    hex: "#00000033",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.2)",
  },
  "var(--ds-gray-alpha-500)": {
    token: "var(--ds-gray-alpha-500)",
    hex: "#0000004d",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.3)",
  },
  "var(--ds-gray-alpha-600)": {
    token: "var(--ds-gray-alpha-600)",
    hex: "#00000080",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.5)",
  },
  "var(--ds-gray-alpha-700)": {
    token: "var(--ds-gray-alpha-700)",
    hex: "#00000099",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.6)",
  },
  "var(--ds-gray-alpha-800)": {
    token: "var(--ds-gray-alpha-800)",
    hex: "#000000b3",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.7)",
  },
  "var(--ds-gray-alpha-900)": {
    token: "var(--ds-gray-alpha-900)",
    hex: "#000000cc",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.8)",
  },
  "var(--ds-gray-alpha-1000)": {
    token: "var(--ds-gray-alpha-1000)",
    hex: "#000000e6",
    oklch: null,
    hsla: "hsla(0, 0%, 0%, 0.9)",
  },

  // Blue
  "var(--ds-blue-100)": {
    token: "var(--ds-blue-100)",
    hex: "#f7f9fe",
    oklch: "oklch(97.32% 0.0141 251.56)",
    hsla: null,
  },
  "var(--ds-blue-200)": {
    token: "var(--ds-blue-200)",
    hex: "#f2f6fe",
    oklch: "oklch(96.29% 0.0195 250.59)",
    hsla: null,
  },
  "var(--ds-blue-300)": {
    token: "var(--ds-blue-300)",
    hex: "#e9f1fd",
    oklch: "oklch(94.58% 0.0293 249.849)",
    hsla: null,
  },
  "var(--ds-blue-400)": {
    token: "var(--ds-blue-400)",
    hex: "#d9e7fc",
    oklch: "oklch(91.58% 0.0473 245.116)",
    hsla: null,
  },
  "var(--ds-blue-500)": {
    token: "var(--ds-blue-500)",
    hex: "#b0cef9",
    oklch: "oklch(82.75% 0.0979 248.48)",
    hsla: null,
  },
  "var(--ds-blue-600)": {
    token: "var(--ds-blue-600)",
    hex: "#7fb0f5",
    oklch: "oklch(73.08% 0.1583 248.133)",
    hsla: null,
  },
  "var(--ds-blue-700)": {
    token: "var(--ds-blue-700)",
    hex: "#0070f3",
    oklch: "oklch(57.61% 0.2508 258.23)",
    hsla: null,
  },
  "var(--ds-blue-800)": {
    token: "var(--ds-blue-800)",
    hex: "#0060df",
    oklch: "oklch(51.51% 0.2399 257.85)",
    hsla: null,
  },
  "var(--ds-blue-900)": {
    token: "var(--ds-blue-900)",
    hex: "#0055c3",
    oklch: "oklch(53.18% 0.2399 256.99)",
    hsla: null,
  },
  "var(--ds-blue-1000)": {
    token: "var(--ds-blue-1000)",
    hex: "#002b5c",
    oklch: "oklch(26.67% 0.1099 254.34)",
    hsla: null,
  },

  // Red
  "var(--ds-red-100)": {
    token: "var(--ds-red-100)",
    hex: "#fef7f5",
    oklch: "oklch(96.5% 0.0223 13.09)",
    hsla: null,
  },
  "var(--ds-red-200)": {
    token: "var(--ds-red-200)",
    hex: "#fef2ef",
    oklch: "oklch(95.41% 0.0299 14.2526)",
    hsla: null,
  },
  "var(--ds-red-300)": {
    token: "var(--ds-red-300)",
    hex: "#feedea",
    oklch: "oklch(94.33% 0.0369 15.0115)",
    hsla: null,
  },
  "var(--ds-red-400)": {
    token: "var(--ds-red-400)",
    hex: "#fde0da",
    oklch: "oklch(91.51% 0.0471 19.8)",
    hsla: null,
  },
  "var(--ds-red-500)": {
    token: "var(--ds-red-500)",
    hex: "#fac5ba",
    oklch: "oklch(84.47% 0.1018 17.71)",
    hsla: null,
  },
  "var(--ds-red-600)": {
    token: "var(--ds-red-600)",
    hex: "#f59b8d",
    oklch: "oklch(71.12% 0.1881 21.22)",
    hsla: null,
  },
  "var(--ds-red-700)": {
    token: "var(--ds-red-700)",
    hex: "#e5484d",
    oklch: "oklch(62.56% 0.2524 23.03)",
    hsla: null,
  },
  "var(--ds-red-800)": {
    token: "var(--ds-red-800)",
    hex: "#dc3d43",
    oklch: "oklch(58.19% 0.2482 25.15)",
    hsla: null,
  },
  "var(--ds-red-900)": {
    token: "var(--ds-red-900)",
    hex: "#cd2b31",
    oklch: "oklch(54.99% 0.232 25.29)",
    hsla: null,
  },
  "var(--ds-red-1000)": {
    token: "var(--ds-red-1000)",
    hex: "#381316",
    oklch: "oklch(24.8% 0.1041 18.86)",
    hsla: null,
  },

  // Amber
  "var(--ds-amber-100)": {
    token: "var(--ds-amber-100)",
    hex: "#fefdfb",
    oklch: "oklch(97.48% 0.0331 85.79)",
    hsla: null,
  },
  "var(--ds-amber-200)": {
    token: "var(--ds-amber-200)",
    hex: "#fefbe9",
    oklch: "oklch(96.81% 0.0495 90.2423)",
    hsla: null,
  },
  "var(--ds-amber-300)": {
    token: "var(--ds-amber-300)",
    hex: "#fff7c2",
    oklch: "oklch(95.93% 0.0636 90.52)",
    hsla: null,
  },
  "var(--ds-amber-400)": {
    token: "var(--ds-amber-400)",
    hex: "#ffecbc",
    oklch: "oklch(91.02% 0.1322 88.25)",
    hsla: null,
  },
  "var(--ds-amber-500)": {
    token: "var(--ds-amber-500)",
    hex: "#f5d90a",
    oklch: "oklch(86.55% 0.1583 79.63)",
    hsla: null,
  },
  "var(--ds-amber-600)": {
    token: "var(--ds-amber-600)",
    hex: "#f7b955",
    oklch: "oklch(80.25% 0.1953 73.59)",
    hsla: null,
  },
  "var(--ds-amber-700)": {
    token: "var(--ds-amber-700)",
    hex: "#ffb224",
    oklch: "oklch(81.87% 0.1969 76.46)",
    hsla: null,
  },
  "var(--ds-amber-800)": {
    token: "var(--ds-amber-800)",
    hex: "#f59f0a",
    oklch: "oklch(77.21% 0.1991 64.28)",
    hsla: null,
  },
  "var(--ds-amber-900)": {
    token: "var(--ds-amber-900)",
    hex: "#ad5700",
    oklch: "oklch(52.79% 0.1496 54.65)",
    hsla: null,
  },
  "var(--ds-amber-1000)": {
    token: "var(--ds-amber-1000)",
    hex: "#4e2009",
    oklch: "oklch(30.83% 0.099 45.48)",
    hsla: null,
  },

  // Green
  "var(--ds-green-100)": {
    token: "var(--ds-green-100)",
    hex: "#f6fef9",
    oklch: "oklch(97.59% 0.0289 145.42)",
    hsla: null,
  },
  "var(--ds-green-200)": {
    token: "var(--ds-green-200)",
    hex: "#f1fdf6",
    oklch: "oklch(96.92% 0.037 147.15)",
    hsla: null,
  },
  "var(--ds-green-300)": {
    token: "var(--ds-green-300)",
    hex: "#e3fbeb",
    oklch: "oklch(94.6% 0.0674 144.23)",
    hsla: null,
  },
  "var(--ds-green-400)": {
    token: "var(--ds-green-400)",
    hex: "#d3f9df",
    oklch: "oklch(91.49% 0.0976 146.24)",
    hsla: null,
  },
  "var(--ds-green-500)": {
    token: "var(--ds-green-500)",
    hex: "#aaf0c4",
    oklch: "oklch(85.45% 0.1627 146.3)",
    hsla: null,
  },
  "var(--ds-green-600)": {
    token: "var(--ds-green-600)",
    hex: "#73e2a3",
    oklch: "oklch(80.25% 0.214 145.18)",
    hsla: null,
  },
  "var(--ds-green-700)": {
    token: "var(--ds-green-700)",
    hex: "#3dd68c",
    oklch: "oklch(64.58% 0.1746 147.27)",
    hsla: null,
  },
  "var(--ds-green-800)": {
    token: "var(--ds-green-800)",
    hex: "#2bb673",
    oklch: "oklch(57.81% 0.1507 147.5)",
    hsla: null,
  },
  "var(--ds-green-900)": {
    token: "var(--ds-green-900)",
    hex: "#1e9b5c",
    oklch: "oklch(51.75% 0.1453 147.65)",
    hsla: null,
  },
  "var(--ds-green-1000)": {
    token: "var(--ds-green-1000)",
    hex: "#193b2d",
    oklch: "oklch(29.15% 0.1197 147.38)",
    hsla: null,
  },

  // Teal
  "var(--ds-teal-100)": {
    token: "var(--ds-teal-100)",
    hex: "#f3fefd",
    oklch: "oklch(97.72% 0.0359 186.7)",
    hsla: null,
  },
  "var(--ds-teal-200)": {
    token: "var(--ds-teal-200)",
    hex: "#f0fdfa",
    oklch: "oklch(97.06% 0.0347 180.66)",
    hsla: null,
  },
  "var(--ds-teal-300)": {
    token: "var(--ds-teal-300)",
    hex: "#e0faf4",
    oklch: "oklch(94.92% 0.0478 182.07)",
    hsla: null,
  },
  "var(--ds-teal-400)": {
    token: "var(--ds-teal-400)",
    hex: "#ccf7ed",
    oklch: "oklch(92.76% 0.0718 183.78)",
    hsla: null,
  },
  "var(--ds-teal-500)": {
    token: "var(--ds-teal-500)",
    hex: "#99f6e0",
    oklch: "oklch(86.88% 0.1344 182.42)",
    hsla: null,
  },
  "var(--ds-teal-600)": {
    token: "var(--ds-teal-600)",
    hex: "#5fe9d0",
    oklch: "oklch(81.5% 0.161 178.96)",
    hsla: null,
  },
  "var(--ds-teal-700)": {
    token: "var(--ds-teal-700)",
    hex: "#2dd4bf",
    oklch: "oklch(64.92% 0.1572 181.95)",
    hsla: null,
  },
  "var(--ds-teal-800)": {
    token: "var(--ds-teal-800)",
    hex: "#14b8a6",
    oklch: "oklch(57.53% 0.1392 181.66)",
    hsla: null,
  },
  "var(--ds-teal-900)": {
    token: "var(--ds-teal-900)",
    hex: "#0d9488",
    oklch: "oklch(52.08% 0.1251 182.93)",
    hsla: null,
  },
  "var(--ds-teal-1000)": {
    token: "var(--ds-teal-1000)",
    hex: "#134e4a",
    oklch: "oklch(32.11% 0.0788 179.82)",
    hsla: null,
  },

  // Purple
  "var(--ds-purple-100)": {
    token: "var(--ds-purple-100)",
    hex: "#faf7fe",
    oklch: "oklch(96.5% 0.0223 293.09)",
    hsla: null,
  },
  "var(--ds-purple-200)": {
    token: "var(--ds-purple-200)",
    hex: "#f6f2fe",
    oklch: "oklch(95.41% 0.0299 294.2526)",
    hsla: null,
  },
  "var(--ds-purple-300)": {
    token: "var(--ds-purple-300)",
    hex: "#f1edfe",
    oklch: "oklch(94.33% 0.0369 295.0115)",
    hsla: null,
  },
  "var(--ds-purple-400)": {
    token: "var(--ds-purple-400)",
    hex: "#e4e0fd",
    oklch: "oklch(91.51% 0.0471 299.8)",
    hsla: null,
  },
  "var(--ds-purple-500)": {
    token: "var(--ds-purple-500)",
    hex: "#cac5fa",
    oklch: "oklch(84.47% 0.1018 297.71)",
    hsla: null,
  },
  "var(--ds-purple-600)": {
    token: "var(--ds-purple-600)",
    hex: "#a99bf5",
    oklch: "oklch(71.12% 0.1881 301.22)",
    hsla: null,
  },
  "var(--ds-purple-700)": {
    token: "var(--ds-purple-700)",
    hex: "#8b5cf6",
    oklch: "oklch(62.56% 0.2524 303.03)",
    hsla: null,
  },
  "var(--ds-purple-800)": {
    token: "var(--ds-purple-800)",
    hex: "#7c3aed",
    oklch: "oklch(58.19% 0.2482 305.15)",
    hsla: null,
  },
  "var(--ds-purple-900)": {
    token: "var(--ds-purple-900)",
    hex: "#6d28d9",
    oklch: "oklch(54.99% 0.232 305.29)",
    hsla: null,
  },
  "var(--ds-purple-1000)": {
    token: "var(--ds-purple-1000)",
    hex: "#2e1065",
    oklch: "oklch(24.8% 0.1041 298.86)",
    hsla: null,
  },

  // Pink
  "var(--ds-pink-100)": {
    token: "var(--ds-pink-100)",
    hex: "#fef7fb",
    oklch: "oklch(96.5% 0.0223 343.09)",
    hsla: null,
  },
  "var(--ds-pink-200)": {
    token: "var(--ds-pink-200)",
    hex: "#fef2f8",
    oklch: "oklch(95.41% 0.0299 344.2526)",
    hsla: null,
  },
  "var(--ds-pink-300)": {
    token: "var(--ds-pink-300)",
    hex: "#feedf5",
    oklch: "oklch(94.33% 0.0369 345.0115)",
    hsla: null,
  },
  "var(--ds-pink-400)": {
    token: "var(--ds-pink-400)",
    hex: "#fde0ee",
    oklch: "oklch(91.51% 0.0471 349.8)",
    hsla: null,
  },
  "var(--ds-pink-500)": {
    token: "var(--ds-pink-500)",
    hex: "#fac5e1",
    oklch: "oklch(84.47% 0.1018 347.71)",
    hsla: null,
  },
  "var(--ds-pink-600)": {
    token: "var(--ds-pink-600)",
    hex: "#f59bcf",
    oklch: "oklch(71.12% 0.1881 351.22)",
    hsla: null,
  },
  "var(--ds-pink-700)": {
    token: "var(--ds-pink-700)",
    hex: "#ec4899",
    oklch: "oklch(62.56% 0.2524 353.03)",
    hsla: null,
  },
  "var(--ds-pink-800)": {
    token: "var(--ds-pink-800)",
    hex: "#db2777",
    oklch: "oklch(58.19% 0.2482 355.15)",
    hsla: null,
  },
  "var(--ds-pink-900)": {
    token: "var(--ds-pink-900)",
    hex: "#be185d",
    oklch: "oklch(54.99% 0.232 355.29)",
    hsla: null,
  },
  "var(--ds-pink-1000)": {
    token: "var(--ds-pink-1000)",
    hex: "#500724",
    oklch: "oklch(24.8% 0.1041 348.86)",
    hsla: null,
  },
}
