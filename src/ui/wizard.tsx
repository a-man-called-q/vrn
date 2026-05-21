import { Box, Text, useApp, useInput } from "ink"

import { Bubble } from "./bubble.js"
import { palette } from "./colors.js"
import { WizardInput } from "./fields/index.js"
import { useWizardState } from "./use-wizard-state.js"
import { wizardSpeech, type Step } from "./wizard-core.js"

export type {
  Step,
  TextStep,
  ConfirmStep,
  SelectStep,
  MultiSelectStep,
} from "./wizard-core.js"

export interface WizardProps {
  intro: string
  steps: Step[]
  onComplete: (answers: Record<string, unknown>) => void
  onCancel: () => void
}

export function Wizard({ intro, steps, onComplete, onCancel }: WizardProps) {
  const { exit } = useApp()
  const { snap, current, canGoBack, commit, back, hover } = useWizardState(steps, onComplete)

  useInput((_input, key) => {
    if (key.escape) {
      exit()
      onCancel()
      return
    }
    if (key.shift && key.tab) {
      back()
    }
  })

  if (snap.done || !current) return null

  const speech = wizardSpeech(snap, current, steps, intro)

  return (
    <Box flexDirection="column">
      <Bubble active speech={speech} />
      <Box marginTop={1} flexDirection="column">
        <WizardInput
          key={`step-${snap.idx}`}
          step={current}
          answers={snap.answers}
          initialAnswer={snap.answers[current.id]}
          onSubmit={commit}
          onHighlight={hover}
        />
        {canGoBack && (
          <Box marginTop={1}>
            <Text color={palette.hint} dimColor>
              <Text color={palette.accent}>shift+tab</Text> back · <Text color={palette.accent}>esc</Text> cancel
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
