import { join } from "node:path"
import { copyTemplateDir, copyTemplateFile } from "../utils/template.js"

const TEMPLATES_DIR = new URL("../templates", import.meta.url).pathname

export interface BackofficeGeneratorData {
  name: string
  authProvider: string
  backofficePort: string
  apiSource: string
  [key: string]: unknown
}

/**
 * Generate the Backoffice admin app: apps/backoffice-{name}/
 */
export function generateBackoffice(
  targetDir: string,
  data: BackofficeGeneratorData
): void {
  const { name, authProvider } = data
  const destDir = join(targetDir, `apps/backoffice-${name}`)

  // Common files
  copyTemplateDir(
    join(TEMPLATES_DIR, "apps/backoffice/common"),
    destDir,
    data
  )

  // Auth-provider-specific files
  copyTemplateDir(
    join(TEMPLATES_DIR, `apps/backoffice/${authProvider}`),
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
    defaultRoute: "/dashboard",
    authClientModule: "zitadel",
  }
  copyTemplateFile(
    join(TEMPLATES_DIR, `_shared/${authProvider}/server-auth.ts`),
    join(destDir, "src/server/auth.ts"),
    serverAuthData
  )

  const loginData = {
    ...data,
    defaultRoute: "/dashboard",
    loginSubtitle: "Sign in with your admin account",
    loginButton: "Continue to Login",
  }
  copyTemplateFile(
    join(TEMPLATES_DIR, `_shared/${authProvider}/login.tsx`),
    join(destDir, "src/routes/_auth/login.tsx"),
    loginData
  )
}
