import * as React from "react"
import { cn } from "../lib/utils"

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("fill-current", className)} {...props}>
      <path d="M16 3 28 9.75v12.5L16 29 4 22.25V9.75L16 3Zm0 5.1-7.5 4.2v7.4L16 23.9l7.5-4.2v-7.4L16 8.1Zm0 3.8 4.2 2.35v3.5L16 20.1l-4.2-2.35v-3.5L16 11.9Z" />
    </svg>
  )
}
