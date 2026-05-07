import { join } from "node:path"
import { copyTemplateDir, copyTemplateFile } from "../utils/template.js"
import { TemplateData } from "../types.js"

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
  data: TemplateData,
  config: FrontendConfig
): void {
  const { name, authMode } = data
  const destDir = join(targetDir, `apps/${config.prefix}-${name}`)

  copyTemplateDir(join(templatesDir, "packages/ui"), join(targetDir, "packages/ui"), data)
  copyTemplateDir(join(templatesDir, `apps/${config.kind}`), destDir, data)

  copyTemplateFile(
    join(templatesDir, `_shared/${authMode}/session.ts`),
    join(destDir, "src/lib/auth/session.ts"),
    data
  )

  const serverAuthData = {
    ...data,
    defaultRoute: config.defaultRoute,
    authClientModule: config.authClientModule,
  }
  copyTemplateFile(
    join(templatesDir, `_shared/${authMode}/server-auth.ts`),
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
    join(templatesDir, `_shared/${authMode}/login.tsx`),
    join(destDir, "src/routes/_auth/login.tsx"),
    loginData
  )
}
