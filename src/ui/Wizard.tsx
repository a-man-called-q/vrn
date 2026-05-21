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
  type MultiSelectStep,
  type SelectStep,
  type TextStep,
} from "./wizard-core.js"

export type { Step, TextStep, ConfirmStep, SelectStep, MultiSelectStep } from "./wizard-core.js"

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

// ─── Input rendering ───────────────────────────────────────────────────

interface WizardInputProps {
  step: Step
  answers: Record<string, unknown>
  initialAnswer: unknown
  onSubmit: (v: unknown) => void
  onHighlight: (v: unknown) => void
}

function WizardInput({ step, answers, initialAnswer, onSubmit, onHighlight }: WizardInputProps) {
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
  if (step.kind === "multiselect") {
    return (
      <MultiSelectField
        step={step}
        answers={answers}
        initialAnswer={initialAnswer}
        onSubmit={onSubmit}
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
      itemComponent={SelectItem}
      onHighlight={item => onHighlight(item.value)}
      onSelect={item => onSubmit(item.value)}
    />
  )
}

function MultiSelectField({
  step,
  answers,
  initialAnswer,
  onSubmit,
}: {
  step: MultiSelectStep
  answers: Record<string, unknown>
  initialAnswer: unknown
  onSubmit: (v: string[]) => void
}) {
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

// Custom select item — colors the trailing warning hint (⚠ …) using the
// palette's warn tone so timed-out probes read as a warning, not a value.
// Preserves ink-select-input's default selected-item color for the rest.
function SelectItem({ isSelected, label }: { isSelected?: boolean; label: string }) {
  const warnIdx = label.indexOf("⚠")
  const headColor = isSelected ? "blue" : undefined
  if (warnIdx === -1) {
    return <Text color={headColor}>{label}</Text>
  }
  const head = label.slice(0, warnIdx)
  const warn = label.slice(warnIdx)
  return (
    <Text color={headColor}>
      {head}
      <Text color={palette.warn}>{warn}</Text>
    </Text>
  )
}
