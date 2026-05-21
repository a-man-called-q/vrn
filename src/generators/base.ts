import { join } from "node:path"
import { copyTemplateDir } from "../utils/template.js"
import { ProjectConfig, BaseTemplateData } from "../types.js"

export function generateBase(
  targetDir: string,
  templatesDir: string,
  config: ProjectConfig
): void {
  const templateData: BaseTemplateData = {
    name: config.name,
    projectName: config.name,
    authMode: config.useZitadel ? "zitadel" : "local",
    multiTenant: config.multiTenant ?? false,
    packageManager: config.packageManagers.js.name,
    packageManagerVersion: config.packageManagers.js.version,
    ...(config.packageManagers.python && {
      pythonManager: config.packageManagers.python.name,
      pythonManagerVersion: config.packageManagers.python.version,
    }),
    ...(config.packageManagers.rust && {
      rustManager: config.packageManagers.rust.name,
      rustManagerVersion: config.packageManagers.rust.version,
    }),
    moonVersion: config.moonVersion,
  }
  copyTemplateDir(join(templatesDir, "base"), targetDir, templateData)
}
