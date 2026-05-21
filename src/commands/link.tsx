import { useEffect, useState } from "react"
import { render, useApp } from "ink"

import { requireProjectRoot, readProjectConfig } from "../utils/project.js"
import { runInstallQuiet } from "../utils/install.js"
import { linkServices } from "../actions/link.js"
import { Bubble, type Speech } from "../ui/index.js"
import { verney } from "../personality/index.js"
import type { ProjectConfig } from "../types.js"

type Phase =
  | { kind: "linking" }
  | { kind: "installing"; addedDep: string; clientPkg: string; servicePkgPath: string }
  | { kind: "done"; addedDep?: { clientPkg: string; servicePkgPath: string } }
  | { kind: "warn"; message: string }
  | { kind: "error"; message: string }

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

  useEffect(() => {
    if (phase.kind === "done" || phase.kind === "warn" || phase.kind === "error") {
      const t = setTimeout(() => exit(), 50)
      return () => clearTimeout(t)
    }
  }, [phase.kind, exit])

  return <Bubble active={isActivePhase(phase)} speech={phaseSpeech(phase, source, target)} />
}

export function phaseSpeech(phase: Phase, source: string, target: string): Speech {
  switch (phase.kind) {
    case "linking":
      return {
        ask: verney.link.intro(source, target),
        status: "wiring it up",
      }
    case "installing":
      return {
        ask: verney.link.intro(source, target),
        details: [verney.link.addedDep(phase.clientPkg, phase.servicePkgPath)],
        status: verney.link.installing,
      }
    case "warn":
      return { warn: phase.message }
    case "error":
      return { error: phase.message }
    case "done": {
      const details: string[] = []
      if (phase.addedDep) {
        details.push(verney.link.addedDep(phase.addedDep.clientPkg, phase.addedDep.servicePkgPath))
      }
      return {
        ask: verney.link.intro(source, target),
        details,
        closing: verney.link.success(source, target),
      }
    }
  }
}

function isActivePhase(phase: Phase): boolean {
  return phase.kind === "linking" || phase.kind === "installing"
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
