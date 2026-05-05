import { join } from "node:path"
import { copyTemplateDir } from "../utils/template.js"
import { ProjectConfig, TemplateData } from "../types.js"

export function generateBase(
  targetDir: string,
  templatesDir: string,
  config: ProjectConfig
): void {
  const templateData: TemplateData = {
    name: config.name,
    projectName: config.name,
    authProvider: config.useZitadel ? "zitadel" : "better-auth",
    serviceFramework: "elysia",
    apiSource: config.name,
    apiPort: "4001",
    portalPort: "3001",
    backofficePort: "5175",
    packageManager: config.packageManager,
    packageManagerVersion: config.packageManagerVersion,
    moonVersion: config.moonVersion,
  }
  copyTemplateDir(join(templatesDir, "base"), targetDir, templateData)
}
