import * as p from "@clack/prompts"
import { spawnSync } from "node:child_process"
import { findProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"
import { generateService } from "../generators/service.js"
import { generatePortal } from "../generators/portal.js"
import { generateBackoffice } from "../generators/backoffice.js"
import { regenerateDocker } from "../generators/docker.js"
import { AppEntry, AuthMode, ProjectConfig, ServiceFramework, TemplateData } from "../types.js"

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname

function buildTemplateData(appEntry: AppEntry, config: ProjectConfig): TemplateData {
  const firstService = config.apps.find(a => a.type === "service")
  const firstPortal = config.apps.find(a => a.type === "portal")
  const firstBackoffice = config.apps.find(a => a.type === "backoffice")

  const connectedService = appEntry.apiSource
    ? config.apps.find(a => a.type === "service" && a.name === appEntry.apiSource)
    : firstService

  const authMode: AuthMode = config.useZitadel ? "zitadel" : "local"

  return {
    name: appEntry.name,
    projectName: config.name,
    authMode,
    serviceFramework: appEntry.serviceFramework ?? connectedService?.serviceFramework ?? "elysia",
    apiSource: appEntry.apiSource ?? (appEntry.type !== "service" ? (firstService?.name ?? appEntry.name) : appEntry.name),
    apiPort: appEntry.type === "service" ? appEntry.port : (connectedService?.port ?? "4001"),
    portalPort: appEntry.type === "portal" ? appEntry.port : (firstPortal?.port ?? "3001"),
    backofficePort: appEntry.type === "backoffice" ? appEntry.port : (firstBackoffice?.port ?? "5175"),
    packageManager: config.packageManager,
    packageManagerVersion: config.packageManagerVersion,
    moonVersion: config.moonVersion,
  }
}

async function promptAppName(
  appType: "service" | "portal" | "backoffice",
  config: ProjectConfig
): Promise<string> {
  const example = appType === "service" ? "user → user-service"
    : appType === "portal" ? "customer → portal-customer"
    : "ops → backoffice-ops"

  const name = await p.text({
    message: `App name (e.g. ${example})`,
    placeholder: appType === "service" ? "user" : appType === "portal" ? "customer" : "ops",
    validate(value) {
      if (!value || value.trim() === "") return "App name is required."
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
      if (config.apps.some(a => a.type === appType && a.name === value)) {
        return `A ${appType} named "${value}" already exists in this project.`
      }
    },
  })
  if (p.isCancel(name)) { p.cancel("Cancelled."); process.exit(0) }
  return name
}

async function promptPort(defaultPort: string): Promise<string> {
  const port = await p.text({
    message: "Port",
    placeholder: defaultPort,
    initialValue: defaultPort,
    validate(value) {
      if (!value) return "Port is required."
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > 65535) return "Port must be a number between 1 and 65535."
    }
  })
  if (p.isCancel(port)) { p.cancel("Cancelled."); process.exit(0) }
  return (port as string) || defaultPort
}

async function promptApiSource(config: ProjectConfig): Promise<string> {
  const services = config.apps.filter(a => a.type === "service")

  if (services.length === 0) {
    const source = await p.text({
      message: "Which service name does this frontend connect to?",
      placeholder: "my-service",
      validate(value) {
        if (!value || value.trim() === "") return "Service name is required."
      },
    })
    if (p.isCancel(source)) { p.cancel("Cancelled."); process.exit(0) }
    return source as string
  }

  const choice = await p.select({
    message: "Which service does this connect to?",
    options: [
      ...services.map(s => ({ value: s.name, label: `${s.name} (registered)` })),
      { value: "__other__", label: "Other (enter manually)" },
    ],
  })
  if (p.isCancel(choice)) { p.cancel("Cancelled."); process.exit(0) }

  if (choice === "__other__") {
    const manual = await p.text({
      message: "Service name",
      placeholder: "my-service",
      validate(value) {
        if (!value || value.trim() === "") return "Service name is required."
      },
    })
    if (p.isCancel(manual)) { p.cancel("Cancelled."); process.exit(0) }
    return manual as string
  }

  return choice as string
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
    const framework = await p.select<ServiceFramework>({
      message: "Service framework",
      options: [
        { value: "elysia", label: "Elysia (TypeScript, Bun-native)" },
        { value: "litestar", label: "Litestar (Python, uv)" },
      ],
    })
    if (p.isCancel(framework)) { p.cancel("Cancelled."); process.exit(0) }

    const port = await promptPort("4001")

    appEntry = {
      name: appName,
      type: "service",
      dirName: `${appName}-service`,
      serviceFramework: framework as ServiceFramework,
      port,
    }
  } else {
    const apiSource = await promptApiSource(config)
    const port = await promptPort(appType === "portal" ? "3001" : "5175")

    appEntry = {
      name: appName,
      type: appType,
      dirName: appType === "portal" ? `portal-${appName}` : `backoffice-${appName}`,
      port,
      apiSource,
    }
  }

  const updatedConfig: ProjectConfig = { ...config, apps: [...config.apps, appEntry] }
  const templateData = buildTemplateData(appEntry, updatedConfig)

  const genSpinner = p.spinner()
  genSpinner.start(`Generating ${appType}...`)

  try {
    if (appType === "service") {
      generateService(projectRoot, templatesDir, templateData)
    } else if (appType === "portal") {
      generatePortal(projectRoot, templatesDir, templateData)
    } else {
      generateBackoffice(projectRoot, templatesDir, templateData)
    }

    regenerateDocker(projectRoot, templatesDir, updatedConfig)
    writeProjectConfig(projectRoot, updatedConfig)

    const label = appType.charAt(0).toUpperCase() + appType.slice(1)
    genSpinner.stop(`${label} added: apps/${appEntry.dirName}/`)
  } catch (err) {
    genSpinner.stop(`Failed to generate ${appType}.`)
    console.error(err)
    process.exit(1)
  }

  const installSpinner = p.spinner()
  installSpinner.start("Installing dependencies...")
  const installResult = spawnSync(config.packageManager, ["install"], {
    cwd: projectRoot,
    stdio: "pipe",
    shell: true,
  })
  if (installResult.status === 0) {
    installSpinner.stop("Dependencies installed!")
  } else {
    installSpinner.stop(`Install failed — run '${config.packageManager} install' manually.`)
  }

  return updatedConfig
}

export async function run(): Promise<void> {
  const projectRoot = findProjectRoot()
  if (!projectRoot) {
    console.error("Not inside a VRN project. Run `bun create vrn <name>` to create one.")
    process.exit(1)
  }

  let config = readProjectConfig(projectRoot)

  console.log()
  p.intro(`vrn gen — Add apps to ${config.name}`)

  const validTypes = ["service", "portal", "backoffice"]
  const typeArg = process.argv[3]
  let pendingType: "service" | "portal" | "backoffice" | undefined =
    validTypes.includes(typeArg) ? (typeArg as "service" | "portal" | "backoffice") : undefined

  while (true) {
    let appType: "service" | "portal" | "backoffice"

    if (pendingType) {
      appType = pendingType
      pendingType = undefined
    } else {
      const choice = await p.select({
        message: "What do you want to add?",
        options: [
          { value: "service", label: "Service (API backend)" },
          { value: "portal", label: "Portal (end-user frontend)" },
          { value: "backoffice", label: "Backoffice (admin dashboard)" },
          { value: "done", label: "Done" },
        ],
      })
      if (p.isCancel(choice) || choice === "done") break
      appType = choice as "service" | "portal" | "backoffice"
    }

    config = await runGen(projectRoot, appType, config)
  }

  p.outro("Done! Run your dev server to see the changes.")
}
