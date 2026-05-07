import * as React from "react"
import { cn } from "../lib/utils"

type ToggleGroupContextValue = {
  value?: string
  setValue: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null)

type ToggleGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: "single" | "multiple"
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function ToggleGroup({ className, value, defaultValue, onValueChange, ...props }: ToggleGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value ?? internalValue

  const setValue = React.useCallback((nextValue: string) => {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }, [onValueChange])

  return (
    <ToggleGroupContext.Provider value=\{{ value: currentValue, setValue }}>
      <div className={cn("inline-flex items-center rounded-md bg-muted p-1", className)} {...props} />
    </ToggleGroupContext.Provider>
  )
}

export function ToggleGroupItem({
  className,
  value,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(ToggleGroupContext)
  const active = context?.value === value

  return (
    <button
      {...props}
      type="button"
      data-state={active ? "on" : "off"}
      className={cn("inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-medium data-[state=on]:bg-background data-[state=on]:shadow-xs", className)}
      onClick={(event) => {
        props.onClick?.(event)
        context?.setValue(value)
      }}
    />
  )
}
