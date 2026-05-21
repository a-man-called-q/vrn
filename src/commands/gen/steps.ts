// Wizard step lists for the gen-command — split per app-type (service vs.
// portal/backoffice). The links multiselect is shared between them.

import {
  selectStepFromVoice,
  textStepFromVoice,
  type Step,
} from "../../ui/index.js"
import { verney } from "../../personality/index.js"
import type { AppEntry, ProjectConfig, ServiceFramework } from "../../types.js"
import type { AppType } from "../../actions/gen.js"

import { DEFAULT_PORTS } from "./types.js"

const NAME_RE = /^[a-z][a-z0-9-]*$/

export function validateAppName(appType: AppType, config: ProjectConfig) {
  return (value: string): string | undefined => {
    if (!value || value.trim() === "") return "name is required"
    if (!NAME_RE.test(value)) return "lowercase letters, numbers, and hyphens only"
    if (config.apps.some(a => a.type === appType && a.name === value)) {
      return `a ${appType} named "${value}" already exists`
    }
  }
}

export function validatePort(value: string): string | undefined {
  if (!value) return "port is required"
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 65535) return "port must be 1–65535"
}

// Shared "which services should it talk to?" multiselect.
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

export function buildServiceSteps(config: ProjectConfig): Step[] {
  const { framework, port, appName } = verney.gen
  return [
    textStepFromVoice(appName, {
      id: "name",
      hint: appName.hintExamples.service,
      placeholder: appName.placeholder.service,
      validate: validateAppName("service", config),
      reaction: v => `okay — ${v}-service`,
      recap: v => `${v}-service`,
    }),
    selectStepFromVoice(framework, {
      id: "framework",
      options: [
        { value: "elysia", label: "elysia (typescript, bun-native)" },
        { value: "litestar", label: "litestar (python, uv)" },
      ],
      initialValue: "elysia",
    }),
    linksStep(config),
    textStepFromVoice(port, {
      id: "port",
      placeholder: DEFAULT_PORTS.service,
      validate: validatePort,
      reaction: v => `port ${v}`,
      recap: v => `port ${v}`,
    }),
  ]
}

export function buildFrontendSteps(
  appType: "portal" | "backoffice",
  config: ProjectConfig,
): Step[] {
  const { appName, port } = verney.gen

  return [
    textStepFromVoice(appName, {
      id: "name",
      hint: appName.hintExamples[appType],
      placeholder: appName.placeholder[appType],
      validate: validateAppName(appType, config),
      reaction: v => `okay — ${appType}-${v}`,
      recap: v => `${appType}-${v}`,
    }),
    linksStep(config),
    textStepFromVoice(port, {
      id: "port",
      placeholder: DEFAULT_PORTS[appType],
      validate: validatePort,
      reaction: v => `port ${v}`,
      recap: v => `port ${v}`,
    }),
  ]
}

// Translate wizard answers into the AppEntry persisted in vrn.yaml.
export function answersToApp(
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
