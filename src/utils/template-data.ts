import { AppEntry, AuthMode, ProjectConfig, TemplateData } from "../types.js"

const DEFAULT_PORTS = {
  service: "4001",
  portal: "3001",
  backoffice: "5175",
} as const

function portFor(
  appEntry: AppEntry,
  config: ProjectConfig,
  appType: "service" | "portal" | "backoffice",
  fallback: string
): string {
  if (appEntry.type === appType) return appEntry.port
  const candidate = appType === "service"
    ? (appEntry.apiSource
        ? config.apps.find(a => a.type === "service" && a.name === appEntry.apiSource)
        : config.apps.find(a => a.type === "service"))
    : config.apps.find(a => a.type === appType)
  return candidate?.port ?? fallback
}

export function buildTemplateData(appEntry: AppEntry, config: ProjectConfig): TemplateData {
  const connectedService = appEntry.apiSource
    ? config.apps.find(a => a.type === "service" && a.name === appEntry.apiSource)
    : config.apps.find(a => a.type === "service")

  const authMode: AuthMode = config.useZitadel ? "zitadel" : "local"
  const addons = config.addons ?? []

  return {
    name: appEntry.name,
    projectName: config.name,
    authMode,
    multiTenant: config.multiTenant ?? false,
    subscription: addons.includes("subscription"),
    serviceFramework: appEntry.serviceFramework ?? connectedService?.serviceFramework ?? "elysia",
    apiSource: appEntry.apiSource ?? (appEntry.type !== "service"
      ? (config.apps.find(a => a.type === "service")?.name ?? appEntry.name)
      : appEntry.name),
    apiPort: portFor(appEntry, config, "service", DEFAULT_PORTS.service),
    portalPort: portFor(appEntry, config, "portal", DEFAULT_PORTS.portal),
    backofficePort: portFor(appEntry, config, "backoffice", DEFAULT_PORTS.backoffice),
    packageManager: config.packageManager,
    packageManagerVersion: config.packageManagerVersion,
    moonVersion: config.moonVersion,
  }
}
