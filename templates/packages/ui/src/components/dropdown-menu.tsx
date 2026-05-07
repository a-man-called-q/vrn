import * as React from "react"
import { renderSlot } from "../lib/render"
import { cn } from "../lib/utils"

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-flex">{children}</div>
}

type DropdownMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  render?: React.ReactElement
}

export function DropdownMenuTrigger({ className, render, children, ...props }: DropdownMenuTriggerProps) {
  const triggerClassName = cn("inline-flex items-center justify-center", className)

  return renderSlot(
    render,
    { className: triggerClassName, children, ...props },
    <button type="button" className={triggerClassName} {...props}>{children}</button>,
  )
}

export function DropdownMenuContent({
  className,
  align,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }) {
  return (
    <div
      data-align={align}
      className={cn("z-50 min-w-32 rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}
      {...props}
    />
  )
}

export function DropdownMenuItem({
  className,
  variant,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "destructive" }) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  checked,
  onCheckedChange,
  children,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <button
      {...props}
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent", className)}
      onClick={(event) => {
        props.onClick?.(event)
        onCheckedChange?.(!checked)
      }}
    >
      <span className="w-4 text-center">{checked ? "✓" : ""}</span>
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1.5 text-sm font-medium", className)} {...props} />
}

export function DropdownMenuGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-1", className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}
