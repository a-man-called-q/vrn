import { palette } from "./colors.js"

// Speech is the structured intent of what verney is saying at a moment.
// It is rendered into BubbleLine[] by speechToLines() and shown via Bubble.
// Treat Speech as the canonical voice format — wizard, commands, and phases
// all compose Speech objects rather than handcrafting BubbleLine arrays.

export type RowStatus = "done" | "pending" | "active" | "skipped" | "failed"

export interface SpeechRow {
  text: string
  status?: RowStatus
  detail?: string
}

export type MoodTone = "neutral" | "back"

export interface Speech {
  // verney's reactive line at the top — intro on first frame, ack after a
  // commit, or a "back to that" line when the user steps back.
  mood?: { text: string; tone?: MoodTone }
  // running waiter-style summary of what we have so far.
  recap?: string
  // the main question or statement for the current frame.
  ask?: string
  // live commentary on whichever option is currently highlighted. takes
  // priority over hint when both are set.
  hover?: string
  // static fallback hint when no option is being hovered.
  hint?: string
  // "doing X" footer — pair with details for context.
  status?: string
  // a single-line closing/success message.
  closing?: string
  // a single-line soft warning (yellow).
  warn?: string
  // a single-line error message (red).
  error?: string
  // dim sub-lines that follow status / error / closing.
  details?: string[]
  // structured status-table rows (used by doctor/sync style outputs).
  rows?: SpeechRow[]
}

export interface BubbleLine {
  text: string
  italic?: boolean
  dim?: boolean
  color?: string
}

const STATUS_MARK: Record<RowStatus, string> = {
  done: "✓",
  pending: "·",
  active: "✦",
  skipped: "·",
  failed: "✗",
}

const STATUS_COLOR: Record<RowStatus, string> = {
  done: palette.done,
  pending: palette.pending,
  active: palette.active,
  skipped: palette.pending,
  failed: palette.error,
}

// Translate a Speech into ordered BubbleLine[]. Pure: same input → same output.
// The order below is intentional: mood (verney's reaction) → recap (what we've
// got) → ask (what verney wants) → hover/hint (commentary) → status table →
// status footer → closing/error → details.
export function speechToLines(speech: Speech): BubbleLine[] {
  const out: BubbleLine[] = []

  if (speech.mood) {
    out.push({
      text: speech.mood.text,
      italic: true,
      color: speech.mood.tone === "back" ? palette.warn : palette.label,
    })
  }

  if (speech.recap) {
    out.push({ text: `so far — ${speech.recap}`, dim: true })
  }

  if (speech.ask) {
    out.push({ text: speech.ask })
  }

  if (speech.hover) {
    out.push({ text: speech.hover, italic: true, color: palette.accent })
  } else if (speech.hint) {
    out.push({ text: speech.hint, italic: true, dim: true })
  }

  if (speech.rows && speech.rows.length > 0) {
    if (out.length > 0) out.push({ text: "", dim: true })
    const labelW = Math.max(...speech.rows.map(r => r.text.length))
    for (const row of speech.rows) {
      const mark = row.status ? STATUS_MARK[row.status] : "·"
      const color = row.status ? STATUS_COLOR[row.status] : undefined
      const tail = row.detail ? `  ${row.detail}` : ""
      out.push({ text: `${mark} ${row.text.padEnd(labelW)}${tail}`, color })
    }
  }

  if (speech.status) {
    out.push({ text: `${speech.status}…`, italic: true, dim: true })
  }

  if (speech.closing) {
    if (out.length > 0 && (speech.rows || speech.status)) {
      out.push({ text: "", dim: true })
    }
    out.push({ text: speech.closing, color: palette.done })
  }

  if (speech.warn) {
    out.push({ text: speech.warn, color: palette.warn })
  }

  if (speech.error) {
    out.push({ text: speech.error, color: palette.error })
  }

  if (speech.details && speech.details.length > 0) {
    for (const d of speech.details) out.push({ text: d, dim: true })
  }

  return out
}

// True if a Speech has no renderable content.
export function speechIsEmpty(speech: Speech): boolean {
  return speechToLines(speech).length === 0
}

// Decorate the status field with a leading glyph (typically a rotating
// spinner frame). Returns the speech unchanged when there's no status.
// Pure — pair with useSpinner() at the call site.
export function withSpinner(speech: Speech, glyph: string): Speech {
  if (!speech.status || !glyph) return speech
  return { ...speech, status: `${glyph} ${speech.status}` }
}
