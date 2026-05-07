import * as React from "react"
import { cn } from "../lib/utils"

export function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted", className)} {...props} />
}

export function AvatarImage({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={cn("aspect-square size-full object-cover", className)} {...props} />
}

export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium", className)} {...props} />
}
