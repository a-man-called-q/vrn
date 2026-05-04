export type PackageManager = "bun" | "npm" | "pnpm" | "yarn"

export type GenType =
  | "full"
  | "service"
  | "portal"
  | "backoffice"

export type AuthProvider = "zitadel" | "better-auth"

export type ServiceFramework = "elysia" | "litestar"

export interface ScaffoldData {
  name: string
  authProvider: AuthProvider
  serviceFramework: ServiceFramework
  genType: GenType
  apiSource: string
  apiPort: string
  portalPort: string
  backofficePort: string
  packageManager: PackageManager
  packageManagerVersion: string
  moonVersion: string
}
