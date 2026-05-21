import { useEffect, useState } from "react"
import { render, useApp } from "ink"

import { requireProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import * as subscriptionAddon from "../addons/subscription.js"
import { Bubble, type Speech } from "../ui/index.js"
import { verney } from "../personality/index.js"
import type { ProjectConfig } from "../types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

const ADDONS = {
  subscription: subscriptionAddon,
} as const

type AddonName = keyof typeof ADDONS

type Phase =
  | { kind: "installing" }
  | { kind: "done" }
  | { kind: "error"; message: string }

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
    const addon = ADDONS[addonName]
    const updated: ProjectConfig = { ...config, addons: [...(config.addons ?? []), addonName] }
    try {
      addon.install(projectRoot, TEMPLATES_DIR, updated)
      writeProjectConfig(projectRoot, updated)
      setPhase({ kind: "done" })
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }, [phase.kind])

  useEffect(() => {
    if (phase.kind === "done" || phase.kind === "error") {
      const t = setTimeout(() => exit(), 50)
      return () => clearTimeout(t)
    }
  }, [phase.kind, exit])

  return <Bubble active={phase.kind === "installing"} speech={phaseSpeech(phase, addonName)} />
}

export function phaseSpeech(phase: Phase, addonName: string): Speech {
  switch (phase.kind) {
    case "installing":
      return {
        ask: verney.add.intro(addonName),
        status: verney.add.installing(addonName),
      }
    case "error":
      return {
        ask: verney.add.intro(addonName),
        error: verney.add.failed(addonName),
        details: [phase.message],
      }
    case "done":
      return {
        ask: verney.add.intro(addonName),
        closing: verney.add.installed(addonName),
        details: ["", verney.add.nextSteps],
      }
  }
}

export async function run(): Promise<void> {
  const addonArg = process.argv[3] as AddonName | undefined

  if (!addonArg) {
    console.log(verney.add.listHeader)
    for (const [name, addon] of Object.entries(ADDONS)) {
      console.log(`  ${name.padEnd(16)} ${addon.description}`)
    }
    process.exit(0)
  }

  if (!Object.hasOwn(ADDONS, addonArg)) {
    console.error(verney.add.unknown(addonArg, Object.keys(ADDONS).join(", ")))
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
