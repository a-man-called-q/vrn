import { useEffect, useState } from "react"
import { Box, render, useApp } from "ink"
import SelectInput from "ink-select-input"

import { requireProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"
import { generateApp } from "../generators/index.js"
import { regenerateDocker } from "../generators/docker.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import { runInstallQuiet } from "../utils/install.js"
import { runGen, type AppType } from "../utils/gen-runner.js"
import { linkAll } from "../actions/link.js"
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

function linksStep(config: ProjectConfig): Step {
  const { links } = verney.gen
  const services = config.apps.filter(a => a.type === "service")
  return {
    kind: "multiselect",
    id: "links",
    label: "links",
    prompt: links.ask,
    hint: links.hint,
    resolveOptions: answers => {
      const ownName = answers["name"] as string | undefined
      return services
        .filter(a => a.name !== ownName)
        .map(a => ({ value: a.name, label: a.name }))
    },
    skipIf: answers => {
      const ownName = answers["name"] as string | undefined
      return services.filter(a => a.name !== ownName).length === 0
    },
    reaction: v => v.length === 0 ? "no links — you can wire later" : `wiring ${v.join(", ")}`,
    recap: v => v.length > 0 ? `→ ${v.join(", ")}` : undefined,
  }
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
    linksStep(config),
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
  const { appName, port } = verney.gen

  return [
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
    linksStep(config),
    {
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
    },
  ]
}

function answersToApp(
  appType: AppType,
  answers: Record<string, unknown>,
): AppEntry {
  const name = answers["name"] as string
  const port = (answers["port"] as string) || DEFAULT_PORTS[appType]
  const linksRaw = answers["links"]
  const links = Array.isArray(linksRaw) ? (linksRaw as string[]) : []

  if (appType === "service") {
    return {
      name,
      type: "service",
      dirName: `${name}-service`,
      serviceFramework: answers["framework"] as ServiceFramework,
      port,
    }
  }

  return {
    name,
    type: appType,
    dirName: appType === "portal" ? `portal-${name}` : `backoffice-${name}`,
    port,
    apiSource: links[0],
  }
}

type Phase =
  | { kind: "menu" }
  | { kind: "wizard"; appType: AppType }
  | { kind: "generating"; app: AppEntry; picks: string[] }
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
      linkAll(projectRoot, next, phase.app, phase.picks)
      setConfig(next)
      setAddedApps(prev => [...prev, phase.app])
      // when user invoked `vrn gen <type>`, finish after one app instead of
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

// ─── Flag parsing ─────────────────────────────────────────────────────

function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < argv.length - 1; i++) {
    const k = argv[i]!
    const v = argv[i + 1]!
    if (k.startsWith("--") && !v.startsWith("--")) {
      flags[k.slice(2)] = v
      i++
    }
  }
  return flags
}

// ─── Non-interactive run ───────────────────────────────────────────────

function parseLinks(flags: Record<string, string>): string[] | undefined {
  const raw = flags["links"] ?? flags["api-source"]
  if (raw === undefined) return undefined
  return raw.split(",").map(s => s.trim()).filter(Boolean)
}

function runNonInteractive(
  appType: AppType,
  flags: Record<string, string>,
  projectRoot: string,
  config: ProjectConfig,
): void {
  try {
    const app = runGen(
      {
        type: appType,
        name: flags["name"]!,
        framework: flags["framework"] as "elysia" | "litestar" | undefined,
        port: flags["port"],
        links: parseLinks(flags),
      },
      projectRoot,
      config,
    )
    process.stdout.write(`done — ${app.dirName}\n`)
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`)
    process.exit(1)
  }
}

// ─── Entry point ───────────────────────────────────────────────────────

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
