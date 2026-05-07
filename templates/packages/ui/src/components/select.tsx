import * as React from "react"
import { cn } from "../lib/utils"

type SelectContextValue = {
  value?: string
  setValue: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  items?: { label: string; value: string }[]
  children: React.ReactNode
}

export function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value ?? internalValue

  const setValue = React.useCallback((nextValue: string) => {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }, [onValueChange])

  return (
    <SelectContext.Provider value=\{{ value: currentValue, setValue }}>
      <div className="relative inline-flex flex-col gap-1">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "default" }) {
  return (
    <button
      type="button"
      data-size={size}
      className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-xs", className)}
      {...props}
    />
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = React.useContext(SelectContext)
  return <span data-slot="select-value">{context?.value ?? placeholder}</span>
}

export function SelectContent({
  className,
  align,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }) {
  return (
    <div
      data-align={align}
      className={cn("z-50 mt-1 min-w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}
      {...props}
    />
  )
}

export function SelectGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-1", className)} {...props} />
}

export function SelectItem({
  className,
  value,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(SelectContext)

  return (
    <button
      {...props}
      type="button"
      className={cn("flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent", className)}
      onClick={(event) => {
        props.onClick?.(event)
        context?.setValue(value)
      }}
    >
      {children}
    </button>
  )
}
