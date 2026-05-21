export type JsPackageManager = "bun" | "npm" | "pnpm" | "yarn"
export type PythonPackageManager = "uv" | "pip"
export type RustPackageManager = "cargo"
export type AuthMode = "zitadel" | "local"
export type ServiceFramework = "elysia" | "litestar"

// Kept for backwards-compat with template-data consumers.
export type PackageManager = JsPackageManager

export interface PackageManagerEntry<Name extends string = string> {
  name: Name
  version: string
}

export interface PackageManagers {
  js: PackageManagerEntry<JsPackageManager>
  python?: PackageManagerEntry<PythonPackageManager>
  rust?: PackageManagerEntry<RustPackageManager>
}

export interface ProjectConfig {
  name: string
  packageManagers: PackageManagers
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
  packageManager: JsPackageManager
  packageManagerVersion: string
  pythonManager?: PythonPackageManager
  pythonManagerVersion?: string
  rustManager?: RustPackageManager
  rustManagerVersion?: string
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
