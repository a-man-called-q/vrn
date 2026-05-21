import { useEffect, useState } from "react"
import { Box, render, useApp } from "ink"
import SelectInput from "ink-select-input"

import { requireProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"
import { generateApp } from "../generators/index.js"
import { regenerateDocker } from "../generators/docker.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import { runInstallQuiet } from "../utils/install.js"
import {
  Bubble,
  Wizard,
  type Speech,
  type Step,
} from "../ui/index.js"
import {
  verney,
  ack,
  reactionFor,
  hoverFor,
} from "../personality/index.js"
import type { AppEntry, ProjectConfig, ServiceFramework } from "../types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

type AppType = "service" | "portal" | "backoffice"

const DEFAULT_PORTS: Record<AppType, string> = {
  service: "4001",
  portal: "3001",
  backoffice: "5175",
}

const NAME_RE = /^[a-z][a-z0-9-]*$/

function validateAppName(appType: AppType, config: ProjectConfig) {
  return (value: string): string | undefined => {
    if (!value || value.trim() === "") return "name is required"
    if (!NAME_RE.test(value)) return "lowercase letters, numbers, and hyphens only"
    if (config.apps.some(a => a.type === appType && a.name === value)) {
      return `a ${appType} named "${value}" already exists`
    }
  }
}

function validatePort(value: string): string | undefined {
  if (!value) return "port is required"
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 65535) return "port must be 1–65535"
}

function validateServiceName(value: string): string | undefined {
  if (!value || value.trim() === "") return "service name is required"
  if (!NAME_RE.test(value)) return "lowercase letters, numbers, and hyphens only"
}

function buildServiceSteps(config: ProjectConfig): Step[] {
  const { framework, port } = verney.gen
  return [
    {
      kind: "text",
      id: "name",
      label: "name",
      prompt: verney.gen.appName.ask,
      hint: verney.gen.appName.hintExamples.service,
      placeholder: verney.gen.appName.placeholder.service,
      validate: validateAppName("service", config),
      reaction: v => `okay — ${v}-service`,
      display: v => v,
      recap: v => `${v}-service`,
    },
    {
      kind: "select",
      id: "framework",
      label: "framework",
      prompt: framework.ask,
      hint: framework.hint,
      options: [
        { value: "elysia", label: "elysia (typescript, bun-native)" },
        { value: "litestar", label: "litestar (python, uv)" },
      ],
      initialValue: "elysia",
      reaction: v => reactionFor(framework, v as ServiceFramework) ?? ack(),
      hoverComment: v => hoverFor(framework, v as ServiceFramework),
      display: v => v,
      recap: v => v,
    },
    {
      kind: "text",
      id: "port",
      label: "port",
      prompt: port.ask,
      hint: port.hint,
      placeholder: DEFAULT_PORTS.service,
      validate: validatePort,
      reaction: v => `port ${v}`,
      display: v => v,
      recap: v => `port ${v}`,
    },
  ]
}

function buildFrontendSteps(appType: "portal" | "backoffice", config: ProjectConfig): Step[] {
  const { appName, apiSource, apiSourceManual, port } = verney.gen
  const services = config.apps.filter(a => a.type === "service")
  const apiSourceOptions = services.length > 0
    ? [
        ...services.map(s => ({ value: s.name, label: `${s.name} (registered)` })),
        { value: "__other__", label: "other (type manually)" },
      ]
    : []

  const steps: Step[] = [
    {
      kind: "text",
      id: "name",
      label: "name",
      prompt: appName.ask,
      hint: appName.hintExamples[appType],
      placeholder: appName.placeholder[appType],
      validate: validateAppName(appType, config),
      reaction: v => `okay — ${appType}-${v}`,
      display: v => v,
      recap: v => `${appType}-${v}`,
    },
  ]

  if (apiSourceOptions.length > 0) {
    steps.push({
      kind: "select",
      id: "apiSource",
      label: "api source",
      prompt: apiSource.ask,
      hint: apiSource.hint,
      options: apiSourceOptions,
      reaction: v => v === "__other__" ? "okay, type one in" : `wiring to ${v}`,
      display: v => v === "__other__" ? "(manual)" : v,
      recap: v => v === "__other__" ? "" : `→ ${v}`,
    })
    steps.push({
      kind: "text",
      id: "apiSourceManual",
      label: "service",
      prompt: apiSourceManual.ask,
      hint: apiSourceManual.hint,
      placeholder: "my-service",
      validate: validateServiceName,
      reaction: v => `wiring to ${v}`,
      display: v => v,
      recap: v => `→ ${v}`,
      skipIf: answers => answers["apiSource"] !== "__other__",
    })
  } else {
    steps.push({
      kind: "text",
      id: "apiSourceManual",
      label: "service",
      prompt: apiSourceManual.ask,
      hint: apiSourceManual.hint,
      placeholder: "my-service",
      validate: validateServiceName,
      reaction: v => `wiring to ${v}`,
      display: v => v,
      recap: v => `→ ${v}`,
    })
  }

  steps.push({
    kind: "text",
    id: "port",
    label: "port",
    prompt: port.ask,
    hint: port.hint,
    placeholder: DEFAULT_PORTS[appType],
    validate: validatePort,
    reaction: v => `port ${v}`,
    display: v => v,
    recap: v => `port ${v}`,
  })

  return steps
}

function answersToApp(
  appType: AppType,
  answers: Record<string, unknown>,
): AppEntry {
  const name = answers["name"] as string
  const portRaw = (answers["port"] as string) || DEFAULT_PORTS[appType]
  const port = portRaw

  if (appType === "service") {
    return {
      name,
      type: "service",
      dirName: `${name}-service`,
      serviceFramework: answers["framework"] as ServiceFramework,
      port,
    }
  }

  const apiSource = answers["apiSource"] === "__other__" || !answers["apiSource"]
    ? answers["apiSourceManual"] as string
    : answers["apiSource"] as string

  return {
    name,
    type: appType,
    dirName: appType === "portal" ? `portal-${name}` : `backoffice-${name}`,
    port,
    apiSource,
  }
}

type Phase =
  | { kind: "menu" }
  | { kind: "wizard"; appType: AppType }
  | { kind: "generating"; app: AppEntry }
  | { kind: "installing" }
  | { kind: "done" }
  | { kind: "error"; message: string }

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
      setConfig(next)
      setAddedApps(prev => [...prev, phase.app])
      setPhase({ kind: "menu" })
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }, [phase.kind])

  useEffect(() => {
    if (phase.kind !== "installing") return
    runInstallQuiet(projectRoot, config.packageManagers.js.name)
    setPhase({ kind: "done" })
  }, [phase.kind])

  useEffect(() => {
    if (phase.kind === "done" || phase.kind === "error") {
      const t = setTimeout(() => exit(), 50)
      return () => clearTimeout(t)
    }
  }, [phase.kind, exit])

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
          setPhase({ kind: "generating", app })
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

export function menuSpeech(
  projectName: string,
  addedApps: AppEntry[],
  menuHover?: string,
): Speech {
  const pickType = verney.gen.pickType
  const hov = menuHover
    ? hoverFor(pickType, menuHover as "service" | "portal" | "backoffice" | "done")
    : undefined
  return {
    mood: { text: verney.gen.intro(projectName) },
    recap: addedApps.length > 0 ? addedApps.map(a => a.dirName).join(", ") : undefined,
    ask: pickType.ask,
    hover: hov,
    hint: hov ? undefined : pickType.hint,
  }
}

export function phaseSpeech(
  phase: Exclude<Phase, { kind: "menu" } | { kind: "wizard" }>,
  jsPm: string,
  addedApps: AppEntry[],
): Speech {
  switch (phase.kind) {
    case "generating":
      return {
        ask: verney.gen.generating(phase.app.type),
        status: `apps/${phase.app.dirName}`,
      }
    case "installing":
      return {
        ask: verney.gen.installing,
        status: `${jsPm} install`,
      }
    case "done":
      return {
        recap: addedApps.length > 0
          ? addedApps.map(a => a.dirName).join(", ")
          : undefined,
        closing: verney.gen.done,
      }
    case "error":
      return {
        error: verney.gen.failed("app"),
        details: [phase.message],
      }
  }
}

function isActivePhase(phase: Phase): boolean {
  return phase.kind === "generating"
    || phase.kind === "installing"
    || phase.kind === "error"
}

export async function run(): Promise<void> {
  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)
  const validTypes = new Set<AppType>(["service", "portal", "backoffice"])
  const typeArg = process.argv[3]
  const initial: AppType | undefined = typeArg && validTypes.has(typeArg as AppType)
    ? (typeArg as AppType)
    : undefined

  const { waitUntilExit } = render(
    <GenApp projectRoot={projectRoot} initialConfig={config} typeArg={initial} />
  )
  await waitUntilExit()
}
