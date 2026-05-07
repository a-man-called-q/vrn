import * as React from "react"
import { renderSlot } from "../lib/render"
import { cn } from "../lib/utils"

export function SidebarProvider({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-svh w-full bg-background", className)} {...props} />
}

export function Sidebar({
  className,
  variant,
  collapsible,
  ...props
}: React.HTMLAttributes<HTMLElement> & { variant?: string; collapsible?: string }) {
  return (
    <aside
      data-variant={variant}
      data-collapsible={collapsible}
      className={cn("hidden w-(--sidebar-width) shrink-0 border-r bg-muted/30 md:flex md:flex-col", className)}
      {...props}
    />
  )
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <main className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b p-2", className)} {...props} />
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2", className)} {...props} />
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t p-2", className)} {...props} />
}

export function SidebarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1", className)} {...props} />
}

export function SidebarGroupContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1", className)} {...props} />
}

export function SidebarGroupLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1 text-xs font-medium text-muted-foreground", className)} {...props} />
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("grid gap-1", className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("relative", className)} {...props} />
}

type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  render?: React.ReactElement
  tooltip?: React.ReactNode
}

export function SidebarMenuButton({ className, render, tooltip, children, ...props }: SidebarMenuButtonProps) {
  const buttonClassName = cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
    className,
  )

  return renderSlot(
    render,
    { className: buttonClassName, title: typeof tooltip === "string" ? tooltip : undefined, children, ...props },
    <button type="button" className={buttonClassName} title={typeof tooltip === "string" ? tooltip : undefined} {...props}>{children}</button>,
  )
}

export function SidebarMenuAction({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("absolute right-1 top-1.5 inline-flex size-7 items-center justify-center rounded-md hover:bg-accent", className)}
      {...props}
    />
  )
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("inline-flex size-8 items-center justify-center rounded-md hover:bg-accent", className)}
      aria-label="Toggle sidebar"
      {...props}
    >
      <span className="block h-3 w-4 border-y border-current" />
    </button>
  )
}
