import type { Step } from "../wizard-core.js"
import { TextField } from "./text-field.js"
import { ConfirmField } from "./confirm-field.js"
import { SelectField } from "./select-field.js"
import { MultiSelectField } from "./multi-select-field.js"

export { TextField } from "./text-field.js"
export { ConfirmField } from "./confirm-field.js"
export { SelectField } from "./select-field.js"
export { MultiSelectField } from "./multi-select-field.js"
export { SelectItem } from "./select-item.js"

export interface WizardInputProps {
  step: Step
  answers: Record<string, unknown>
  initialAnswer: unknown
  onSubmit: (v: unknown) => void
  onHighlight: (v: unknown) => void
}

// Dispatches a Step to its matching field component.
export function WizardInput({
  step,
  answers,
  initialAnswer,
  onSubmit,
  onHighlight,
}: WizardInputProps) {
  if (step.kind === "text") {
    return <TextField step={step} initialAnswer={initialAnswer} onSubmit={onSubmit} />
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
