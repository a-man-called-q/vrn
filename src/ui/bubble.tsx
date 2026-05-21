import { Box, Text } from "ink"
import { palette } from "./colors.js"
import { speechToLines, withSpinner, type Speech } from "./speech.js"
import { useSpinner } from "./use-spinner.js"
import { bubbleBorders, padRight, width, wrapLine } from "./bubble-render.js"

export type { BubbleLine, Speech } from "./speech.js"

export interface BubbleProps {
  speech: Speech
  speaker?: string
  active?: boolean
  minWidth?: number
  maxWidth?: number
  // Column where the tail elbow `╮` sits inside the bottom border.
  // 1 means flush against the left edge (`╰╮…`), 2 (default) leaves a
  // single dash inside (`╰─╮…`), etc.
  tailOffset?: number
}

// Comic-style speech bubble with a tail nyambung dari pojok kiri-bawah
// via `╰─╮`, speaker name underneath. One bubble at a time in the wizard
// (replace, not append) — verney behaves like a comic frame, not a log.
//
//   ╭────────────────────────╮
//   │  isi dialog ...        │
//   ╰─╮──────────────────────╯
//     verney
//
// Width auto-fits content (using string-width so emoji/CJK measure right).
// Long lines word-wrap to maxWidth; long unbreakable tokens hard-split.
// When `active && speech.status` is set, the status line gets an animated
// spinner glyph prepended.
export function Bubble({
  speech,
  speaker = "verney",
  active = false,
  minWidth = 24,
  maxWidth = 72,
  tailOffset = 2,
}: BubbleProps) {
  const spin = useSpinner()
  const effective = active && speech.status ? withSpinner(speech, spin) : speech

  const wrapped = speechToLines(effective).flatMap(l => wrapLine(l, maxWidth))
  const innerW = Math.max(
    minWidth,
    speaker.length + 4,
    ...wrapped.map(r => width(r.text)),
  )
  const border = active ? palette.borderActive : palette.border
  const { top, bottom } = bubbleBorders(innerW, tailOffset)
  const tailColumn = Math.min(Math.max(tailOffset, 1), innerW + 1)
  const nameIndent = " ".repeat(tailColumn + 1)

  return (
    <Box flexDirection="column">
      <Text color={border}>{top}</Text>
      {wrapped.map((row, i) => (
        <Text key={i} color={border}>
          {"│ "}
          <Text
            color={row.color}
            italic={row.italic}
            dimColor={row.dim}
          >
            {row.text}
          </Text>
          {padRight("", innerW - width(row.text))}
          {" │"}
        </Text>
      ))}
      <Text color={border}>{bottom}</Text>
      <Text color={palette.verney}>{`${nameIndent}${speaker}`}</Text>
    </Box>
  )
}
