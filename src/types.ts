export type PackageManager = "bun" | "npm" | "pnpm" | "yarn"
export type AuthMode = "zitadel" | "local"
export type ServiceFramework = "elysia" | "litestar"

export interface ProjectConfig {
  name: string
  packageManager: PackageManager
  packageManagerVersion: string
  moonVersion: string
  useZitadel: boolean
  multiTenant: boolean
  addons: string[]
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

// Minimal data for base monorepo templates (no app-specific fields).
export interface BaseTemplateData {
  name: string
  projectName: string
  authMode: AuthMode
  multiTenant: boolean
  packageManager: PackageManager
  packageManagerVersion: string
  moonVersion: string
}

// Full data passed to app-level Handlebars templates.
export interface TemplateData extends BaseTemplateData {
  serviceFramework: ServiceFramework
  apiSource: string
  apiPort: string
  portalPort: string
  backofficePort: string
  subscription: boolean
}
