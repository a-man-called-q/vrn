import stringWidth from "string-width"
import type { BubbleLine } from "./speech.js"

// Display width — handles emoji, CJK, ANSI escape codes.
export const width = stringWidth

// Compute the top/bottom border rows for the comic bubble. `innerW` is the
// content area width (without the 1ch left/right padding). `tailOffset` is
// the column in the bottom border where the tail elbow `╮` sits — defaults
// to 2 so the tail naturally drops just inside the left edge.
export function bubbleBorders(innerW: number, tailOffset = 2): { top: string; bottom: string } {
  const offset = Math.min(Math.max(tailOffset, 1), innerW + 1)
  const top = `╭${"─".repeat(innerW + 2)}╮`
  const bottom = `╰${"─".repeat(offset - 1)}╮${"─".repeat(innerW + 2 - offset)}╯`
  return { top, bottom }
}

// Pad a string with spaces on the right to reach exactly `targetWidth`
// columns of display width. No-op when already >= target.
export function padRight(text: string, targetWidth: number): string {
  const w = stringWidth(text)
  if (w >= targetWidth) return text
  return text + " ".repeat(targetWidth - w)
}

// Wrap a single line into one or more BubbleLines that each fit within
// `maxWidth` display columns. Preserves styling. Words longer than
// `maxWidth` are hard-split at column boundaries.
export function wrapLine(line: BubbleLine, maxWidth: number): BubbleLine[] {
  if (stringWidth(line.text) <= maxWidth) return [line]
  const out: BubbleLine[] = []
  // split keeping whitespace separators so we can rebuild the line faithfully.
  const tokens = line.text.split(/(\s+)/)
  let cur = ""
  for (const tok of tokens) {
    if (stringWidth(tok) > maxWidth) {
      // long unbreakable token — flush current and hard-split.
      if (cur.trimEnd().length > 0) {
        out.push({ ...line, text: cur.trimEnd() })
        cur = ""
      }
      for (const chunk of chunkByWidth(tok, maxWidth)) {
        out.push({ ...line, text: chunk })
      }
      continue
    }
    const next = cur + tok
    if (stringWidth(next) > maxWidth) {
      if (cur.trimEnd().length > 0) out.push({ ...line, text: cur.trimEnd() })
      cur = tok.trimStart()
    } else {
      cur = next
    }
  }
  if (cur.trimEnd().length > 0) out.push({ ...line, text: cur.trimEnd() })
  return out
}

// Split a string into chunks each up to `maxWidth` display columns wide.
// Iterates code points (so emoji and surrogates stay intact).
export function chunkByWidth(s: string, maxWidth: number): string[] {
  const out: string[] = []
  let cur = ""
  for (const ch of s) {
    const next = cur + ch
    if (stringWidth(next) > maxWidth) {
      if (cur) out.push(cur)
      cur = ch
    } else {
      cur = next
    }
  }
  if (cur) out.push(cur)
  return out
}
