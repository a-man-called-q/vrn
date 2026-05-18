import * as p from "@clack/prompts"
import { requireProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"
import { runInstall, unwrap } from "../utils/cli.js"
import { buildTemplateData } from "../utils/template-data.js"
import { generateApp } from "../generators/index.js"
import { regenerateDocker } from "../generators/docker.js"
import { AppEntry, ProjectConfig, ServiceFramework } from "../types.js"
import { resolveTemplatesDir } from "../utils/paths.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

const DEFAULT_PORTS = {
  service: "4001",
  portal: "3001",
  backoffice: "5175",
} as const

async function promptAppName(
  appType: "service" | "portal" | "backoffice",
  config: ProjectConfig
): Promise<string> {
  const example = appType === "service" ? "user → user-service"
    : appType === "portal" ? "customer → portal-customer"
    : "ops → backoffice-ops"

  return unwrap(await p.text({
    message: `App name (e.g. ${example})`,
    placeholder: appType === "service" ? "user" : appType === "portal" ? "customer" : "ops",
    validate(value) {
      if (!value || value.trim() === "") return "App name is required."
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
      if (config.apps.some(a => a.type === appType && a.name === value)) {
        return `A ${appType} named "${value}" already exists in this project.`
      }
    },
  }))
}

async function promptPort(defaultPort: string): Promise<string> {
  const port = unwrap(await p.text({
    message: "Port",
    placeholder: defaultPort,
    initialValue: defaultPort,
    validate(value) {
      if (!value) return "Port is required."
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > 65535) return "Port must be a number between 1 and 65535."
    }
  }))
  return port || defaultPort
}

function validateServiceName(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return "Service name is required."
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    return "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

async function promptApiSource(config: ProjectConfig): Promise<string> {
  const services = config.apps.filter(a => a.type === "service")

  if (services.length === 0) {
    return unwrap(await p.text({
      message: "Which service name does this frontend connect to?",
      placeholder: "my-service",
      validate: validateServiceName,
    }))
  }

  const choice = unwrap(await p.select({
    message: "Which service does this connect to?",
    options: [
      ...services.map(s => ({ value: s.name, label: `${s.name} (registered)` })),
      { value: "__other__", label: "Other (enter manually)" },
    ],
  }))

  if (choice === "__other__") {
    return unwrap(await p.text({
      message: "Service name",
      placeholder: "my-service",
      validate: validateServiceName,
    }))
  }

  return choice
}

export async function runGen(
  projectRoot: string,
  appType: "service" | "portal" | "backoffice",
  config: ProjectConfig,
  templatesDir: string = TEMPLATES_DIR
): Promise<ProjectConfig> {
  const appName = await promptAppName(appType, config)

  let appEntry: AppEntry

  if (appType === "service") {
    const framework = unwrap(await p.select<ServiceFramework>({
      message: "Service framework",
      options: [
        { value: "elysia", label: "Elysia (TypeScript, Bun-native)" },
        { value: "litestar", label: "Litestar (Python, uv)" },
      ],
    }))

    const port = await promptPort(DEFAULT_PORTS.service)

    appEntry = {
      name: appName,
      type: "service",
      dirName: `${appName}-service`,
      serviceFramework: framework,
      port,
    }
  } else {
    const apiSource = await promptApiSource(config)
    const port = await promptPort(appType === "portal" ? DEFAULT_PORTS.portal : DEFAULT_PORTS.backoffice)

    appEntry = {
      name: appName,
      type: appType,
      dirName: appType === "portal" ? `portal-${appName}` : `backoffice-${appName}`,
      port,
      apiSource,
    }
  }

  const updatedConfig: ProjectConfig = { ...config, apps: [...config.apps, appEntry] }

  const genSpinner = p.spinner()
  genSpinner.start(`Generating ${appType}...`)

  try {
    generateApp(projectRoot, templatesDir, appEntry, updatedConfig)
    regenerateDocker(projectRoot, templatesDir, updatedConfig)
    writeProjectConfig(projectRoot, updatedConfig)

    const label = appType.charAt(0).toUpperCase() + appType.slice(1)
    genSpinner.stop(`${label} added: apps/${appEntry.dirName}/`)
  } catch (err) {
    genSpinner.stop(`Failed to generate ${appType}.`)
    console.error(err)
    process.exit(1)
  }

  return updatedConfig
}

export async function run(): Promise<void> {
  const projectRoot = requireProjectRoot()
  let config = readProjectConfig(projectRoot)

  console.log()
  p.intro(`vrn gen — Add apps to ${config.name}`)

  const validTypes = new Set(["service", "portal", "backoffice"])
  const typeArg = process.argv[3]
  let pendingType: "service" | "portal" | "backoffice" | undefined =
    validTypes.has(typeArg) ? (typeArg as "service" | "portal" | "backoffice") : undefined

  while (true) {
    let appType: "service" | "portal" | "backoffice"

    if (pendingType) {
      appType = pendingType
      pendingType = undefined
    } else {
      const choice = unwrap(await p.select({
        message: "What do you want to add?",
        options: [
          { value: "service", label: "Service (API backend)" },
          { value: "portal", label: "Portal (end-user frontend)" },
          { value: "backoffice", label: "Backoffice (admin dashboard)" },
          { value: "done", label: "Done" },
        ],
      }))
      if (choice === "done") break
      appType = choice as "service" | "portal" | "backoffice"
    }

    config = await runGen(projectRoot, appType, config)
  }

  runInstall(projectRoot, config.packageManager)

  p.outro("Done! Run your dev server to see the changes.")
}
