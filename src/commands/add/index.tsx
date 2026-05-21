import { useEffect, useState } from "react"
import { render, useApp } from "ink"

import { requireProjectRoot, readProjectConfig, writeProjectConfig } from "../../utils/project.js"
import { resolveTemplatesDir } from "../../utils/paths.js"
import { addons, type AddonName } from "../../addons/index.js"
import { Bubble, useExitOnPhase } from "../../ui/index.js"
import { verney } from "../../personality/index.js"
import type { ProjectConfig } from "../../types.js"

import { phaseSpeech, type Phase } from "./phase-speech.js"

export { phaseSpeech } from "./phase-speech.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

interface AppProps {
  projectRoot: string
  config: ProjectConfig
  addonName: AddonName
}

function AddApp({ projectRoot, config, addonName }: AppProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>({ kind: "installing" })

  useEffect(() => {
    if (phase.kind !== "installing") return
    const addon = addons[addonName]
    const updated: ProjectConfig = { ...config, addons: [...(config.addons ?? []), addonName] }
    try {
      addon.install(projectRoot, TEMPLATES_DIR, updated)
      writeProjectConfig(projectRoot, updated)
      setPhase({ kind: "done" })
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }, [phase.kind])

  useExitOnPhase(phase.kind === "done" || phase.kind === "error", exit)

  return <Bubble active={phase.kind === "installing"} speech={phaseSpeech(phase, addonName)} />
}

export async function run(): Promise<void> {
  const addonArg = process.argv[3] as AddonName | undefined

  if (!addonArg) {
    console.log(verney.add.listHeader)
    for (const [name, addon] of Object.entries(addons)) {
      console.log(`  ${name.padEnd(16)} ${addon.description}`)
    }
    process.exit(0)
  }

  if (!Object.hasOwn(addons, addonArg)) {
    console.error(verney.add.unknown(addonArg, Object.keys(addons).join(", ")))
    process.exit(1)
  }

  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)

  if ((config.addons ?? []).includes(addonArg)) {
    console.log(verney.add.alreadyInstalled(addonArg))
    process.exit(0)
  }

  const { waitUntilExit } = render(
    <AddApp projectRoot={projectRoot} config={config} addonName={addonArg} />
  )
  await waitUntilExit()
}
