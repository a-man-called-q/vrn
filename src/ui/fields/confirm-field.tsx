import SelectInput from "ink-select-input"

import type { ConfirmStep } from "../wizard-core.js"

export interface ConfirmFieldProps {
  step: ConfirmStep
  initialAnswer: unknown
  onSubmit: (v: boolean) => void
  onHighlight: (v: boolean) => void
}

export function ConfirmField({ step, initialAnswer, onSubmit, onHighlight }: ConfirmFieldProps) {
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
