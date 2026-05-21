import { useEffect } from "react"

// Schedule an exit() after a tiny delay once the phase has reached a terminal
// state. The delay lets Ink flush the final frame before the process exits,
// so the user sees the closing speech instead of a blank line.
export function useExitOnPhase(shouldExit: boolean, exit: () => void, delayMs = 50): void {
  useEffect(() => {
    if (!shouldExit) return
    const t = setTimeout(exit, delayMs)
    return () => clearTimeout(t)
  }, [shouldExit, exit, delayMs])
}
