import * as React from "react"
import { cn } from "../lib/utils"

type TabsContextValue = {
  value?: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ className, value, defaultValue, onValueChange, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value ?? internalValue

  const setValue = React.useCallback((nextValue: string) => {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }, [onValueChange])

  return (
    <TabsContext.Provider value=\{{ value: currentValue, setValue }}>
      <div className={cn("flex flex-col gap-2", className)} {...props} />
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />
}

export function TabsTrigger({
  className,
  value,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  const active = context?.value === value

  return (
    <button
      {...props}
      type="button"
      data-state={active ? "active" : "inactive"}
      className={cn("inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs", className)}
      onClick={(event) => {
        props.onClick?.(event)
        context?.setValue(value)
      }}
    />
  )
}

export function TabsContent({
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  if (context?.value && context.value !== value) return null
  return <div className={cn("outline-none", className)} {...props} />
}
