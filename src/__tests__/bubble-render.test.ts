import { describe, expect, test } from "bun:test"
import {
  bubbleBorders,
  chunkByWidth,
  padRight,
  width,
  wrapLine,
} from "../ui/bubble-render.js"

describe("bubbleBorders", () => {
  test("top and bottom borders are the same total width", () => {
    for (const w of [10, 24, 50, 80]) {
      const { top, bottom } = bubbleBorders(w)
      expect(width(top)).toBe(width(bottom))
    }
  })

  test("top renders as a rounded box with innerW + 2 dashes", () => {
    const { top } = bubbleBorders(10)
    // ╭ + 12 dashes + ╮
    expect(top).toBe(`╭${"─".repeat(12)}╮`)
  })

  test("bottom places the tail elbow at the default column 2", () => {
    const { bottom } = bubbleBorders(10)
    // ╰ ─ ╮ then 10 dashes then ╯
    expect(bottom).toBe(`╰─╮${"─".repeat(10)}╯`)
  })

  test("tailOffset = 1 flushes the elbow against the left edge", () => {
    const { bottom } = bubbleBorders(10, 1)
    // ╰ ╮ then 11 dashes then ╯
    expect(bottom).toBe(`╰╮${"─".repeat(11)}╯`)
  })

  test("tailOffset = 4 leaves three dashes before the elbow", () => {
    const { bottom } = bubbleBorders(10, 4)
    // ╰ ─ ─ ─ ╮ then 8 dashes then ╯
    expect(bottom).toBe(`╰${"─".repeat(3)}╮${"─".repeat(8)}╯`)
  })

  test("tailOffset clamps to a valid range", () => {
    // Negative or zero clamps to 1, too-large clamps to innerW + 1.
    const a = bubbleBorders(10, -3)
    const b = bubbleBorders(10, 999)
    expect(width(a.bottom)).toBe(14)
    expect(width(b.bottom)).toBe(14)
  })
})

describe("padRight", () => {
  test("pads ASCII text with spaces", () => {
    expect(padRight("hi", 5)).toBe("hi   ")
  })

  test("does not over-pad text that's already at target width", () => {
    expect(padRight("hello", 5)).toBe("hello")
  })

  test("pads based on display width, not character count", () => {
    // "日本" is 4 columns wide. Pad to 6 should add 2 spaces.
    const padded = padRight("日本", 6)
    expect(width(padded)).toBe(6)
  })
})

describe("wrapLine", () => {
  test("returns the line unchanged when it fits", () => {
    const line = { text: "short line" }
    expect(wrapLine(line, 20)).toEqual([line])
  })

  test("wraps long lines on whitespace boundaries", () => {
    const lines = wrapLine({ text: "the quick brown fox jumps over" }, 10)
    expect(lines.length).toBeGreaterThan(1)
    for (const l of lines) expect(width(l.text)).toBeLessThanOrEqual(10)
  })

  test("preserves styling on each wrapped chunk", () => {
    const lines = wrapLine(
      { text: "one two three four five six", italic: true, dim: true, color: "cyan" },
      10,
    )
    for (const l of lines) {
      expect(l.italic).toBe(true)
      expect(l.dim).toBe(true)
      expect(l.color).toBe("cyan")
    }
  })

  test("hard-splits a token that's longer than maxWidth", () => {
    const lines = wrapLine({ text: "abcdefghijklmnop" }, 5)
    expect(lines.map(l => l.text)).toEqual(["abcde", "fghij", "klmno", "p"])
  })

  test("handles wide chars correctly when wrapping", () => {
    // Each kanji is 2 columns. Width 6 fits 3 kanji.
    const lines = wrapLine({ text: "日本語の練習" }, 6)
    for (const l of lines) expect(width(l.text)).toBeLessThanOrEqual(6)
  })
})

describe("chunkByWidth", () => {
  test("ascii chunks are exact prefixes", () => {
    expect(chunkByWidth("abcdef", 2)).toEqual(["ab", "cd", "ef"])
  })

  test("respects emoji width", () => {
    // 🦊 is width 2. With maxWidth 2 each emoji gets its own chunk.
    const chunks = chunkByWidth("🦊🦊🦊", 2)
    for (const c of chunks) expect(width(c)).toBeLessThanOrEqual(2)
  })
})
