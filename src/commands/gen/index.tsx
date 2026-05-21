import { useEffect, useState } from "react"
import { Box, render, useApp } from "ink"
import SelectInput from "ink-select-input"

import {
  requireProjectRoot,
  readProjectConfig,
  writeProjectConfig,
} from "../../utils/project.js"
import { generateApp } from "../../generators/index.js"
import { regenerateDocker } from "../../generators/docker/index.js"
import { resolveTemplatesDir } from "../../utils/paths.js"
import { runInstallQuiet } from "../../utils/pm.js"
import { parseFlags } from "../../utils/parse-flags.js"
import { type AppType } from "../../actions/gen.js"
import { linkAll } from "../../actions/link.js"
import { Bubble, useExitOnPhase } from "../../ui/index.js"
import { Wizard } from "../../ui/index.js"
import { verney } from "../../personality/index.js"
import type { AppEntry, ProjectConfig } from "../../types.js"

import {
  buildServiceSteps,
  buildFrontendSteps,
  answersToApp,
} from "./steps.js"
import {
  menuSpeech,
  phaseSpeech,
  isActivePhase,
} from "./phase-speech.js"
import { runNonInteractive } from "./non-interactive.js"
import type { Phase } from "./types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

interface AppProps {
  projectRoot: string
  initialConfig: ProjectConfig
  typeArg?: AppType
}

function GenApp({ projectRoot, initialConfig, typeArg }: AppProps) {
  const { exit } = useApp()
  const [config, setConfig] = useState<ProjectConfig>(initialConfig)
  const [addedApps, setAddedApps] = useState<AppEntry[]>([])
  const [phase, setPhase] = useState<Phase>(
    typeArg ? { kind: "wizard", appType: typeArg } : { kind: "menu" }
  )
  const [menuHover, setMenuHover] = useState<string | undefined>()

  useEffect(() => {
    if (phase.kind !== "generating") return
    const next: ProjectConfig = { ...config, apps: [...config.apps, phase.app] }
    try {
      generateApp(projectRoot, TEMPLATES_DIR, phase.app, next)
      regenerateDocker(projectRoot, TEMPLATES_DIR, next)
      writeProjectConfig(projectRoot, next)
      linkAll(projectRoot, next, phase.app, phase.picks)
      setConfig(next)
      setAddedApps(prev => [...prev, phase.app])
      // When user invoked `vrn gen <type>`, finish after one app instead of
      // dropping back into the picker.
      setPhase(typeArg ? { kind: "installing" } : { kind: "menu" })
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }, [phase.kind])

  useEffect(() => {
    if (phase.kind !== "installing") return
    runInstallQuiet(projectRoot, config.packageManagers.js.name)
    setPhase({ kind: "done" })
  }, [phase.kind])

  useExitOnPhase(phase.kind === "done" || phase.kind === "error", exit)

  if (phase.kind === "menu") {
    return (
      <Box flexDirection="column">
        <Bubble active speech={menuSpeech(config.name, addedApps, menuHover)} />
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: "service (api backend)", value: "service" },
              { label: "portal (end-user frontend)", value: "portal" },
              { label: "backoffice (admin dashboard)", value: "backoffice" },
              { label: addedApps.length > 0 ? "done" : "cancel", value: "done" },
            ]}
            onHighlight={item => setMenuHover(item.value)}
            onSelect={item => {
              const v = item.value
              if (v === "done") {
                if (addedApps.length > 0) setPhase({ kind: "installing" })
                else setPhase({ kind: "done" })
              } else {
                setPhase({ kind: "wizard", appType: v as AppType })
              }
            }}
          />
        </Box>
      </Box>
    )
  }

  if (phase.kind === "wizard") {
    const steps = phase.appType === "service"
      ? buildServiceSteps(config)
      : buildFrontendSteps(phase.appType, config)
    return (
      <Wizard
        intro={`${verney.gen.intro(config.name)} · ${phase.appType}`}
        steps={steps}
        onComplete={answers => {
          const app = answersToApp(phase.appType, answers)
          const raw = answers["links"]
          const picks = Array.isArray(raw) ? (raw as string[]) : []
          setPhase({ kind: "generating", app, picks })
        }}
        onCancel={() => setPhase({ kind: "done" })}
      />
    )
  }

  return (
    <Bubble
      active={isActivePhase(phase)}
      speech={phaseSpeech(phase, config.packageManagers.js.name, addedApps)}
    />
  )
}

export { menuSpeech, phaseSpeech } from "./phase-speech.js"

export async function run(): Promise<void> {
  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)
  const validTypes = new Set<AppType>(["service", "portal", "backoffice"])
  const typeArg = process.argv[3]
  const appType: AppType | undefined = typeArg && validTypes.has(typeArg as AppType)
    ? (typeArg as AppType)
    : undefined

  const flags = parseFlags(process.argv.slice(4))

  if (appType && flags["name"]) {
    runNonInteractive(appType, flags, projectRoot, config)
    return
  }

  const { waitUntilExit } = render(
    <GenApp projectRoot={projectRoot} initialConfig={config} typeArg={appType} />
  )
  await waitUntilExit()
}
