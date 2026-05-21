import { Text } from "ink"
import { palette } from "../colors.js"

// Colors the trailing warning hint (⚠ …) using the palette's warn tone so
// timed-out probes read as a warning, not a value. Preserves ink-select-input's
// default selected-item color for the rest.
export function SelectItem({ isSelected, label }: { isSelected?: boolean; label: string }) {
  const warnIdx = label.indexOf("⚠")
  const headColor = isSelected ? "blue" : undefined
  if (warnIdx === -1) {
    return <Text color={headColor}>{label}</Text>
  }
  const head = label.slice(0, warnIdx)
  const warn = label.slice(warnIdx)
  return (
    <Text color={headColor}>
      {head}
      <Text color={palette.warn}>{warn}</Text>
    </Text>
  )
}
