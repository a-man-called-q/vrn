import { join } from "node:path"
import { copyTemplateDir, copyTemplateFile } from "../utils/template.js"

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname

export interface PortalGeneratorData {
  name: string
  authProvider: string
  portalPort: string
  apiSource: string
  [key: string]: unknown
}

/**
 * Generate the Portal frontend app: apps/portal-{name}/
 */
export function generatePortal(targetDir: string, data: PortalGeneratorData): void {
  const { name, authProvider } = data
  const destDir = join(targetDir, `apps/portal-${name}`)

  // Common files
  copyTemplateDir(
    join(TEMPLATES_DIR, "apps/portal/common"),
    destDir,
    data
  )

  // Auth-provider-specific files
  copyTemplateDir(
    join(TEMPLATES_DIR, `apps/portal/${authProvider}`),
    destDir,
    data
  )

  // Shared auth files
  copyTemplateFile(
    join(TEMPLATES_DIR, `_shared/${authProvider}/session.ts`),
    join(destDir, "src/lib/auth/session.ts"),
    data
  )

  const serverAuthData = {
    ...data,
    defaultRoute: "/",
    authClientModule: "api-client",
  }
  copyTemplateFile(
    join(TEMPLATES_DIR, `_shared/${authProvider}/server-auth.ts`),
    join(destDir, "src/server/auth.ts"),
    serverAuthData
  )

  const loginData = {
    ...data,
    defaultRoute: "/",
    loginSubtitle: "Sign in to your account",
    loginButton: "Continue with SSO",
  }
  copyTemplateFile(
    join(TEMPLATES_DIR, `_shared/${authProvider}/login.tsx`),
    join(destDir, "src/routes/_auth/login.tsx"),
    loginData
  )
}
