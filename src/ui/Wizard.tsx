import { useCallback, useEffect, useState } from "react"
import { Box, Text, useApp, useInput } from "ink"
import TextInput from "ink-text-input"
import SelectInput from "ink-select-input"

import { Bubble } from "./Bubble.js"
import { palette } from "./colors.js"
import { ack as ackLine, backReact } from "../personality/index.js"
import {
  advanceSkip,
  applyPreset,
  commitStep,
  findPrevActiveIdx,
  initialSnapshot,
  jumpBack,
  markDone,
  setHover,
  wizardSpeech,
  type Step,
  type WizardSnapshot,
  type ConfirmStep,
  type SelectStep,
  type TextStep,
} from "./wizard-core.js"

export type { Step, TextStep, ConfirmStep, SelectStep } from "./wizard-core.js"

export interface WizardProps {
  intro: string
  steps: Step[]
  onComplete: (answers: Record<string, unknown>) => void
  onCancel: () => void
}

// ─── Hook: marries the pure state machine in wizard-core with React ────

function useWizardState(steps: Step[], onComplete: (answers: Record<string, unknown>) => void) {
  const [snap, setSnap] = useState<WizardSnapshot>(initialSnapshot())
  const current = steps[snap.idx]

  // auto-advance through preset / skipped steps.
  useEffect(() => {
    if (!current) return
    if (current.skipIf?.(snap.answers)) {
      setSnap(advanceSkip)
      return
    }
    if (current.preset && snap.answers[current.id] === undefined) {
      const { value, message } = current.preset
      const line = message ?? current.reaction?.(value as never) ?? ackLine()
      setSnap(s => applyPreset(s, current, value, line))
    }
    // we only want to react to idx — `current` and `snap.answers` change in
    // lockstep with it for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.idx])

  // complete the wizard once we've walked past the last step.
  useEffect(() => {
    if (snap.idx >= steps.length && !snap.done) {
      setSnap(markDone)
      onComplete(snap.answers)
    }
  }, [snap.idx, steps.length, snap.done, snap.answers, onComplete])

  const commit = useCallback((value: unknown) => {
    if (!current) return
    const line = current.reaction?.(value as never) ?? ackLine()
    setSnap(s => commitStep(s, current, value, line))
  }, [current])

  const back = useCallback(() => {
    setSnap(s => jumpBack(s, steps, backReact()))
  }, [steps])

  const hover = useCallback((value: unknown) => {
    setSnap(s => setHover(s, value))
  }, [])

  const canGoBack = findPrevActiveIdx(steps, snap.idx, snap.answers) !== null

  return { snap, current, canGoBack, commit, back, hover }
}

// ─── Wizard ───────────────────────────────────────────────────────────

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

// ─── Input rendering ───────────────────────────────────────────────────

interface WizardInputProps {
  step: Step
  initialAnswer: unknown
  onSubmit: (v: unknown) => void
  onHighlight: (v: unknown) => void
}

function WizardInput({ step, initialAnswer, onSubmit, onHighlight }: WizardInputProps) {
  if (step.kind === "text") {
    return <TextInputField step={step} initialAnswer={initialAnswer} onSubmit={onSubmit} />
  }
  if (step.kind === "confirm") {
    return (
      <ConfirmField
        step={step}
        initialAnswer={initialAnswer}
        onSubmit={onSubmit}
        onHighlight={onHighlight}
      />
    )
  }
  return (
    <SelectField
      step={step}
      initialAnswer={initialAnswer}
      onSubmit={onSubmit}
      onHighlight={onHighlight}
    />
  )
}

function TextInputField({
  step,
  initialAnswer,
  onSubmit,
}: {
  step: TextStep
  initialAnswer: unknown
  onSubmit: (v: string) => void
}) {
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

function ConfirmField({
  step,
  initialAnswer,
  onSubmit,
  onHighlight,
}: {
  step: ConfirmStep
  initialAnswer: unknown
  onSubmit: (v: boolean) => void
  onHighlight: (v: boolean) => void
}) {
  const seed = typeof initialAnswer === "boolean" ? initialAnswer : step.initialValue
  return (
    <SelectInput
      items={[
        { label: step.yesLabel ?? "yes", value: "yes" },
        { label: step.noLabel ?? "no", value: "no" },
      ]}
      initialIndex={seed === false ? 1 : 0}
      onHighlight={item => onHighlight(item.value === "yes")}
      onSelect={item => onSubmit(item.value === "yes")}
    />
  )
}

function SelectField({
  step,
  initialAnswer,
  onSubmit,
  onHighlight,
}: {
  step: SelectStep
  initialAnswer: unknown
  onSubmit: (v: string) => void
  onHighlight: (v: string) => void
}) {
  const seed = typeof initialAnswer === "string" ? initialAnswer : step.initialValue
  const initialIndex = seed
    ? Math.max(0, step.options.findIndex(o => o.value === seed))
    : 0
  return (
    <SelectInput
      items={step.options.map(o => ({ label: o.label, value: o.value }))}
      initialIndex={initialIndex}
      onHighlight={item => onHighlight(item.value)}
      onSelect={item => onSubmit(item.value)}
    />
  )
}
