export const palette = {
  verney: "magenta",
  ack: "magenta",
  border: "magenta",
  borderActive: "magentaBright",
  borderPanel: "gray",
  label: "gray",
  value: "white",
  hint: "gray",
  active: "yellow",
  done: "green",
  pending: "gray",
  accent: "cyan",
  warn: "yellow",
  error: "red",
} as const

export type PaletteKey = keyof typeof palette
