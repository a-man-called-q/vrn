import { join } from "node:path"
import { copyTemplateDir, copyTemplateFile } from "../utils/template.js"
import { ScaffoldData } from "../types.js"

export interface FrontendConfig {
  kind: "portal" | "backoffice"
  prefix: string
  defaultRoute: string
  authClientModule: string
  loginSubtitle: string
  loginButton: string
}

export function generateFrontend(
  targetDir: string,
  templatesDir: string,
  data: ScaffoldData,
  config: FrontendConfig
): void {
  const { name, authProvider } = data
  const destDir = join(targetDir, `apps/${config.prefix}-${name}`)

  copyTemplateDir(
    join(templatesDir, `apps/${config.kind}`),
    destDir,
    data
  )

  // Shared auth files
  copyTemplateFile(
    join(templatesDir, `_shared/${authProvider}/session.ts`),
    join(destDir, "src/lib/auth/session.ts"),
    data
  )

  const serverAuthData = {
    ...data,
    defaultRoute: config.defaultRoute,
    authClientModule: config.authClientModule,
  }
  copyTemplateFile(
    join(templatesDir, `_shared/${authProvider}/server-auth.ts`),
    join(destDir, "src/server/auth.ts"),
    serverAuthData
  )

  const loginData = {
    ...data,
    defaultRoute: config.defaultRoute,
    loginSubtitle: config.loginSubtitle,
    loginButton: config.loginButton,
  }
  copyTemplateFile(
    join(templatesDir, `_shared/${authProvider}/login.tsx`),
    join(destDir, "src/routes/_auth/login.tsx"),
    loginData
  )
}
