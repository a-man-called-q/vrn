import * as React from "react"
import { cn } from "../lib/utils"

type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical"
}

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      data-orientation={orientation}
      className={cn(orientation === "vertical" ? "h-full w-px" : "h-px w-full", "bg-border", className)}
      {...props}
    />
  )
}
