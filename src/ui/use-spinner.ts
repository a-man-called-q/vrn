import { useEffect, useState } from "react"

const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

// Returns a rotating glyph that updates every `intervalMs`. Use as an
// inline indicator inside Speech.status — no separate spinner widget
// needed (and no Ink Spinner, which doesn't fit our custom border).
export function useSpinner(frames: readonly string[] = BRAILLE_FRAMES, intervalMs = 80): string {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI(x => (x + 1) % frames.length), intervalMs)
    return () => clearInterval(id)
  }, [frames, intervalMs])
  return frames[i]!
}
