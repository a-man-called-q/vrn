import * as React from "react"
import * as echarts from "echarts"

interface EChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: Record<string, any>
  style?: React.CSSProperties
  notMerge?: boolean
}

/** Convert any CSS color string (including oklch) to rgb() by painting a 1x1 canvas */
function toRgb(color: string): string {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext("2d")
    if (!ctx) return color
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === 0) return "rgba(0,0,0,0)"
    return `rgb(${r},${g},${b})`
  } catch {
    return color
  }
}

const CSS_COLOR_RE = /^(#|rgb|hsl|oklch|oklab|lch|lab|color\(|hwb|transparent$)/

/** Recursively replace CSS var() strings with their resolved rgb() values */
function resolveCSSVars(value: unknown): unknown {
  if (typeof value === "string") {
    const resolved = value.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_, varName, fallback) => {
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim()
      return computed || fallback?.trim() || ""
    })
    // Convert modern color formats (oklch etc.) that canvas can't parse
    return CSS_COLOR_RE.test(resolved.trim()) ? toRgb(resolved.trim()) : resolved
  }
  if (Array.isArray(value)) return value.map(resolveCSSVars)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolveCSSVars(v)])
    )
  }
  return value
}

export function EChart({ option, style, notMerge = false }: EChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const chartRef = React.useRef<echarts.ECharts | null>(null)

  React.useEffect(() => {
    if (!containerRef.current) return
    chartRef.current = echarts.init(containerRef.current)
    chartRef.current.setOption(resolveCSSVars(option) as Record<string, unknown>, notMerge)

    const observer = new ResizeObserver(() => chartRef.current?.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  React.useEffect(() => {
    chartRef.current?.setOption(resolveCSSVars(option) as Record<string, unknown>, notMerge)
  }, [option, notMerge])

  return <div ref={containerRef} style={style} />
}
