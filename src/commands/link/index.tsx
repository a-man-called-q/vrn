import { useEffect, useState } from "react"
import { render, useApp } from "ink"

import { requireProjectRoot, readProjectConfig } from "../../utils/project.js"
import { runInstallQuiet } from "../../utils/pm.js"
import { linkServices } from "../../actions/link.js"
import { Bubble, useExitOnPhase } from "../../ui/index.js"
import { verney } from "../../personality/index.js"
import type { ProjectConfig } from "../../types.js"

import { phaseSpeech, isActivePhase, type Phase } from "./phase-speech.js"

export { phaseSpeech } from "./phase-speech.js"

interface AppProps {
  projectRoot: string
  config: ProjectConfig
  source: string
  target: string
}

function LinkApp({ projectRoot, config, source, target }: AppProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>({ kind: "linking" })

  useEffect(() => {
    if (phase.kind !== "linking") return
    const result = linkServices(projectRoot, config, source, target)
    if (!result.ok) {
      const map: Record<typeof result.reason, { kind: "warn" | "error"; message: string }> = {
        "self-link": { kind: "error", message: verney.link.selfLink },
        "already-linked": { kind: "warn", message: verney.link.alreadyLinked(source, target) },
        "source-not-found": { kind: "error", message: verney.link.sourceNotFound(source) },
        "target-not-found": { kind: "error", message: verney.link.targetNotFound(target) },
      }
      setPhase(map[result.reason])
      return
    }
    if (result.addedDep) {
      setPhase({
        kind: "installing",
        addedDep: result.clientPkg,
        clientPkg: result.clientPkg,
        servicePkgPath: result.servicePkgPath,
      })
    } else {
      setPhase({ kind: "done" })
    }
  }, [phase.kind])

  useEffect(() => {
    if (phase.kind !== "installing") return
    runInstallQuiet(projectRoot, config.packageManagers.js.name)
    setPhase({
      kind: "done",
      addedDep: { clientPkg: phase.clientPkg, servicePkgPath: phase.servicePkgPath },
    })
  }, [phase.kind])

  useExitOnPhase(
    phase.kind === "done" || phase.kind === "warn" || phase.kind === "error",
    exit,
  )

  return <Bubble active={isActivePhase(phase)} speech={phaseSpeech(phase, source, target)} />
}

export async function run(): Promise<void> {
  const source = process.argv[3]
  const target = process.argv[4]

  if (!source || !target) {
    console.error(verney.link.usage)
    process.exit(1)
  }

  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)

  const { waitUntilExit } = render(
    <LinkApp projectRoot={projectRoot} config={config} source={source} target={target} />
  )
  await waitUntilExit()
}
