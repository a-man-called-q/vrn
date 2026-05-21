import { useState } from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"

import { palette } from "../colors.js"
import type { TextStep } from "../wizard-core.js"

export interface TextFieldProps {
  step: TextStep
  initialAnswer: unknown
  onSubmit: (v: string) => void
}

export function TextField({ step, initialAnswer, onSubmit }: TextFieldProps) {
  const [value, setValue] = useState(typeof initialAnswer === "string" ? initialAnswer : "")
  const [error, setError] = useState<string | undefined>()
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={palette.accent}>❯ </Text>
        <TextInput
          value={value}
          onChange={v => {
            setValue(v)
            if (error) setError(undefined)
          }}
          placeholder={step.placeholder}
          onSubmit={v => {
            const err = step.validate?.(v)
            if (err) {
              setError(err)
              return
            }
            onSubmit(v)
          }}
        />
      </Box>
      {error && <Text color={palette.error}>{error}</Text>}
    </Box>
  )
}
