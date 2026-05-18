import { AppEntry, ProjectConfig } from "../types.js"
import { buildTemplateData } from "../utils/template-data.js"
import { generateService } from "./service.js"
import { generatePortal } from "./portal.js"
import { generateBackoffice } from "./backoffice.js"

export function generateApp(
  projectRoot: string,
  templatesDir: string,
  app: AppEntry,
  config: ProjectConfig
): void {
  const data = buildTemplateData(app, config)
  if (app.type === "service") {
    generateService(projectRoot, templatesDir, data)
  } else if (app.type === "portal") {
    generatePortal(projectRoot, templatesDir, data)
  } else {
    generateBackoffice(projectRoot, templatesDir, data)
  }
}
