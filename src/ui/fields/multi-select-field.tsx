import { useState } from "react"
import { Box, Text, useInput } from "ink"

import { palette } from "../colors.js"
import type { MultiSelectStep } from "../wizard-core.js"

export interface MultiSelectFieldProps {
  step: MultiSelectStep
  answers: Record<string, unknown>
  initialAnswer: unknown
  onSubmit: (v: string[]) => void
}

export function MultiSelectField({
  step,
  answers,
  initialAnswer,
  onSubmit,
}: MultiSelectFieldProps) {
  const options = step.resolveOptions(answers)
  const seed = Array.isArray(initialAnswer)
    ? (initialAnswer as string[])
    : step.initialValue ?? []
  const [selected, setSelected] = useState<Set<string>>(() => new Set(seed))
  const [cursor, setCursor] = useState(0)

  useInput((input, key) => {
    if (options.length === 0) {
      if (key.return) onSubmit([])
      return
    }
    if (key.upArrow) {
      setCursor(c => (c === 0 ? options.length - 1 : c - 1))
    } else if (key.downArrow) {
      setCursor(c => (c === options.length - 1 ? 0 : c + 1))
    } else if (input === " ") {
      const value = options[cursor]!.value
      setSelected(s => {
        const next = new Set(s)
        if (next.has(value)) next.delete(value)
        else next.add(value)
        return next
      })
    } else if (key.return) {
      const ordered = options.filter(o => selected.has(o.value)).map(o => o.value)
      onSubmit(ordered)
    }
  })

  if (options.length === 0) {
    return (
      <Text color={palette.hint} dimColor>
        nothing to pick — <Text color={palette.accent}>enter</Text> to continue
      </Text>
    )
  }

  return (
    <Box flexDirection="column">
      {options.map((opt, i) => {
        const isCursor = i === cursor
        const checked = selected.has(opt.value)
        const head = isCursor ? "❯" : " "
        const box = checked ? "[x]" : "[ ]"
        return (
          <Text key={opt.value} color={isCursor ? "blue" : undefined}>
            {`${head} ${box} ${opt.label}`}
          </Text>
        )
      })}
      <Box marginTop={1}>
        <Text color={palette.hint} dimColor>
          <Text color={palette.accent}>space</Text> toggle ·{" "}
          <Text color={palette.accent}>enter</Text> done
        </Text>
      </Box>
    </Box>
  )
}
