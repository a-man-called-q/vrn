import * as React from "react"
import { cn } from "./utils"

type ElementWithClassName = React.ReactElement<{ className?: string; children?: React.ReactNode }>

export function renderSlot(
  render: React.ReactElement | undefined,
  props: { className?: string; children?: React.ReactNode } & Record<string, unknown>,
  fallback: React.ReactElement,
) {
  if (!render) return fallback

  const element = render as ElementWithClassName
  return React.cloneElement(element, {
    ...props,
    className: cn(element.props.className, props.className),
    children: props.children ?? element.props.children,
  })
}
