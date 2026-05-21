import { join } from "node:path"
import { existsSync } from "node:fs"
import { copyTemplateDir } from "../../utils/template.js"
import { buildTemplateData } from "../../utils/template-data.js"
import type { AppEntry, ProjectConfig } from "../../types.js"

export function appExists(projectRoot: string, app: AppEntry): boolean {
  return existsSync(join(projectRoot, "apps", app.dirName))
}

// Refresh the generated _vrn/ wiring inside a service. No-op for non-service
// apps — portal/backoffice don't carry an _vrn/.
export function syncVrn(
  projectRoot: string,
  templatesDir: string,
  app: AppEntry,
  config: ProjectConfig,
): void {
  if (app.type !== "service") return
  const data = buildTemplateData(app, config)
  const templateBase = app.serviceFramework === "litestar"
    ? "apps/api-python/src/_vrn"
    : "apps/api/src/_vrn"
  copyTemplateDir(
    join(templatesDir, templateBase),
    join(projectRoot, "apps", app.dirName, "src", "_vrn"),
    data,
  )
}
