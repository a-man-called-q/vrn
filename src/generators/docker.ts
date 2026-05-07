import { join } from "node:path"
import { writeFileSync, mkdirSync } from "node:fs"
import { processTemplateFile } from "../utils/template.js"
import { ProjectConfig } from "../types.js"

export function regenerateDocker(
  projectRoot: string,
  templatesDir: string,
  config: ProjectConfig
): void {
  const infraDir = join(projectRoot, "infra")
  mkdirSync(infraDir, { recursive: true })

  const templateData = {
    name: config.name,
    projectName: config.name,
    authMode: config.useZitadel ? "zitadel" : "local",
    packageManager: config.packageManager,
    packageManagerVersion: config.packageManagerVersion,
    moonVersion: config.moonVersion,
    services: config.apps.filter(a => a.type === "service"),
    portals: config.apps.filter(a => a.type === "portal").map(p => ({
      ...p,
      apiPort: config.apps.find(s => s.name === p.apiSource)?.port ?? "4001"
    })),
    backoffices: config.apps.filter(a => a.type === "backoffice").map(b => ({
      ...b,
      apiPort: config.apps.find(s => s.name === b.apiSource)?.port ?? "4001"
    })),
  }

  let content = `services:\n`
  content += processTemplateFile(join(templatesDir, "infra/docker-compose-block.hbs"), templateData)

  if (config.useZitadel) {
    content += processTemplateFile(join(templatesDir, "infra/zitadel-services.hbs"), templateData)
  }

  content += processTemplateFile(join(templatesDir, "infra/docker-compose-footer.hbs"), templateData)

  writeFileSync(join(infraDir, "docker-compose.yml"), content, "utf-8")
}
