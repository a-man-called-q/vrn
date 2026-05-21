import { describe, expect, test } from "bun:test"
import { speechToLines, speechIsEmpty, withSpinner } from "../ui/speech.js"
import { palette } from "../ui/colors.js"

describe("speechToLines", () => {
  test("empty speech yields no lines", () => {
    expect(speechToLines({})).toEqual([])
    expect(speechIsEmpty({})).toBe(true)
  })

  test("renders mood in italic with label color by default", () => {
    const lines = speechToLines({ mood: { text: "hello there" } })
    expect(lines).toEqual([
      { text: "hello there", italic: true, color: palette.label },
    ])
  })

  test("renders back-tone mood with warn color", () => {
    const lines = speechToLines({ mood: { text: "back to that", tone: "back" } })
    expect(lines[0]?.color).toBe(palette.warn)
  })

  test("prefixes recap with 'so far —' and dims it", () => {
    const lines = speechToLines({ recap: "siketaps, local auth" })
    expect(lines).toEqual([
      { text: "so far — siketaps, local auth", dim: true },
    ])
  })

  test("renders ask as a plain bold line", () => {
    const lines = speechToLines({ ask: "pick something" })
    expect(lines).toEqual([{ text: "pick something" }])
  })

  test("hover takes priority over hint when both are set", () => {
    const lines = speechToLines({
      ask: "pick one",
      hover: "this one is fast",
      hint: "ignore me",
    })
    expect(lines).toEqual([
      { text: "pick one" },
      { text: "this one is fast", italic: true, color: palette.accent },
    ])
  })

  test("hint shows as italic dim when no hover", () => {
    const lines = speechToLines({ ask: "pick one", hint: "default works" })
    expect(lines).toEqual([
      { text: "pick one" },
      { text: "default works", italic: true, dim: true },
    ])
  })

  test("status renders with trailing ellipsis", () => {
    const lines = speechToLines({ status: "installing deps" })
    expect(lines).toEqual([
      { text: "installing deps…", italic: true, dim: true },
    ])
  })

  test("closing renders in done color", () => {
    const lines = speechToLines({ closing: "all set" })
    expect(lines).toEqual([{ text: "all set", color: palette.done }])
  })

  test("warn renders in warn color", () => {
    const lines = speechToLines({ warn: "watch out" })
    expect(lines).toEqual([{ text: "watch out", color: palette.warn }])
  })

  test("error renders in error color", () => {
    const lines = speechToLines({ error: "boom" })
    expect(lines).toEqual([{ text: "boom", color: palette.error }])
  })

  test("details follow as dim sub-lines", () => {
    const lines = speechToLines({
      closing: "ok",
      details: ["one", "two"],
    })
    expect(lines).toEqual([
      { text: "ok", color: palette.done },
      { text: "one", dim: true },
      { text: "two", dim: true },
    ])
  })

  test("rows render as a padded status table", () => {
    const lines = speechToLines({
      rows: [
        { text: "bun", status: "done", detail: "1.3.10" },
        { text: "node", status: "failed", detail: "not installed" },
      ],
    })
    expect(lines).toEqual([
      { text: "✓ bun   1.3.10", color: palette.done },
      { text: "✗ node  not installed", color: palette.error },
    ])
  })

  test("rows are visually separated from preceding mood/recap/ask", () => {
    const lines = speechToLines({
      ask: "status",
      rows: [{ text: "bun", status: "done", detail: "1.3.10" }],
    })
    expect(lines).toEqual([
      { text: "status" },
      { text: "", dim: true },
      { text: "✓ bun  1.3.10", color: palette.done },
    ])
  })

  test("withSpinner prepends the glyph to status when status is set", () => {
    const decorated = withSpinner({ status: "installing" }, "⠋")
    expect(decorated.status).toBe("⠋ installing")
  })

  test("withSpinner is a no-op when there's no status", () => {
    const speech = { ask: "hello" }
    expect(withSpinner(speech, "⠋")).toBe(speech)
  })

  test("withSpinner is a no-op when glyph is empty", () => {
    const speech = { status: "doing it" }
    expect(withSpinner(speech, "")).toBe(speech)
  })

  test("withSpinner preserves other fields", () => {
    const decorated = withSpinner(
      { ask: "hi", status: "thinking", details: ["a", "b"] },
      "⠋",
    )
    expect(decorated).toEqual({
      ask: "hi",
      status: "⠋ thinking",
      details: ["a", "b"],
    })
  })

  test("canonical order: mood, recap, ask, hover/hint, rows, status, closing, error, details", () => {
    const lines = speechToLines({
      mood: { text: "got it" },
      recap: "siketaps",
      ask: "next?",
      hover: "this one",
      status: "thinking",
      closing: "done",
      details: ["fyi"],
    })
    const texts = lines.map(l => l.text)
    expect(texts).toEqual([
      "got it",
      "so far — siketaps",
      "next?",
      "this one",
      "thinking…",
      "",
      "done",
      "fyi",
    ])
  })
})
