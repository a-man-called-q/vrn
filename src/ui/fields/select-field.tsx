import SelectInput from "ink-select-input"

import type { SelectStep } from "../wizard-core.js"
import { SelectItem } from "./select-item.js"

export interface SelectFieldProps {
  step: SelectStep
  initialAnswer: unknown
  onSubmit: (v: string) => void
  onHighlight: (v: string) => void
}

export function SelectField({ step, initialAnswer, onSubmit, onHighlight }: SelectFieldProps) {
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
