import * as React from "react"
import { renderSlot } from "../lib/render"
import { cn } from "../lib/utils"

export function Drawer({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DrawerTrigger({
  className,
  render,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: React.ReactElement }) {
  const triggerClassName = cn("inline-flex", className)

  return renderSlot(
    render,
    { className: triggerClassName, children, ...props },
    <button type="button" className={triggerClassName} {...props}>{children}</button>,
  )
}

export function DrawerContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-t-lg border bg-background p-6 shadow-lg", className)} {...props} />
}

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1.5 text-center sm:text-left", className)} {...props} />
}

export function DrawerTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />
}

export function DrawerDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
}

export function DrawerClose({
  className,
  render,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: React.ReactElement }) {
  const closeClassName = cn("inline-flex", className)

  return renderSlot(
    render,
    { className: closeClassName, children, ...props },
    <button type="button" className={closeClassName} {...props}>{children}</button>,
  )
}
