export type PackageManager = "bun" | "npm" | "pnpm" | "yarn"
export type AuthMode = "zitadel" | "local"
export type ServiceFramework = "elysia" | "litestar"

export interface ProjectConfig {
  name: string
  packageManager: PackageManager
  packageManagerVersion: string
  moonVersion: string
  useZitadel: boolean
  apps: AppEntry[]
}

export interface AppEntry {
  name: string
  type: "service" | "portal" | "backoffice"
  dirName: string
  serviceFramework?: ServiceFramework
  port: string
  apiSource?: string
  links?: string[]
}

// Runtime data passed to Handlebars template engine during generation.
// Kept shape-compatible with the old ScaffoldData so no templates need to change.
export interface TemplateData {
  name: string
  projectName: string
  authMode: AuthMode
  serviceFramework: ServiceFramework
  apiSource: string
  apiPort: string
  portalPort: string
  backofficePort: string
  packageManager: PackageManager
  packageManagerVersion: string
  moonVersion: string
}
