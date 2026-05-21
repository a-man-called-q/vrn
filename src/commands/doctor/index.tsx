import { useEffect, useState } from "react"
import { render, useApp } from "ink"

import { Bubble, useExitOnPhase } from "../../ui/index.js"
import { verney } from "../../personality/index.js"

import { checkAll, type CheckResult, type Section } from "./tools.js"
import { summarySpeech } from "./phase-speech.js"

function DoctorApp() {
  const { exit } = useApp()
  const [phase, setPhase] = useState<"checking" | "done">("checking")
  const [sections, setSections] = useState<Section[]>([])
  const [missing, setMissing] = useState<CheckResult[]>([])

  useEffect(() => {
    let cancelled = false
    checkAll().then(result => {
      if (cancelled) return
      setSections(result)
      const required = result.find(s => s.title === "required")?.items ?? []
      setMissing(required.filter(r => !r.installed))
      setPhase("done")
    })
    return () => { cancelled = true }
  }, [])

  useExitOnPhase(phase === "done", exit)

  if (phase === "checking") {
    return (
      <Bubble
        active
        speech={{ ask: verney.doctor.intro, status: verney.doctor.checking }}
      />
    )
  }

  return <Bubble active={missing.length > 0} speech={summarySpeech(sections, missing)} />
}

export async function run(): Promise<void> {
  const { waitUntilExit } = render(<DoctorApp />)
  await waitUntilExit()
}
