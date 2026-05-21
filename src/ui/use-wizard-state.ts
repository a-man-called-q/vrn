// React hook that marries the pure state machine in wizard-core with React.
// Wizard.tsx consumes this and renders the result.

import { useCallback, useEffect, useState } from "react"

import { ack as ackLine, backReact } from "../personality/index.js"
import {
  advanceSkip,
  applyPreset,
  commitStep,
  findPrevActiveIdx,
  initialSnapshot,
  jumpBack,
  markDone,
  setHover,
  type Step,
  type WizardSnapshot,
} from "./wizard-core.js"

export function useWizardState(steps: Step[], onComplete: (answers: Record<string, unknown>) => void) {
  const [snap, setSnap] = useState<WizardSnapshot>(initialSnapshot())
  const current = steps[snap.idx]

  // auto-advance through preset / skipped steps.
  useEffect(() => {
    if (!current) return
    if (current.skipIf?.(snap.answers)) {
      setSnap(advanceSkip)
      return
    }
    if (current.preset && snap.answers[current.id] === undefined) {
      const { value, message } = current.preset
      const line = message ?? current.reaction?.(value as never) ?? ackLine()
      setSnap(s => applyPreset(s, current, value, line))
    }
    // we only want to react to idx — `current` and `snap.answers` change in
    // lockstep with it for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.idx])

  // complete the wizard once we've walked past the last step.
  useEffect(() => {
    if (snap.idx >= steps.length && !snap.done) {
      setSnap(markDone)
      onComplete(snap.answers)
    }
  }, [snap.idx, steps.length, snap.done, snap.answers, onComplete])

  const commit = useCallback((value: unknown) => {
    if (!current) return
    const line = current.reaction?.(value as never) ?? ackLine()
    setSnap(s => commitStep(s, current, value, line))
  }, [current])

  const back = useCallback(() => {
    setSnap(s => jumpBack(s, steps, backReact()))
  }, [steps])

  const hover = useCallback((value: unknown) => {
    setSnap(s => setHover(s, value))
  }, [])

  const canGoBack = findPrevActiveIdx(steps, snap.idx, snap.answers) !== null

  return { snap, current, canGoBack, commit, back, hover }
}
