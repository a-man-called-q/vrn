import { join } from "node:path"
import { writeFileSync, mkdirSync } from "node:fs"
import { processTemplateFile } from "../utils/template.js"
import { ScaffoldData } from "../types.js"

export function generateDocker(
  targetDir: string,
  templatesDir: string,
  data: ScaffoldData
): void {
  const infraDir = join(targetDir, "infra")
  mkdirSync(infraDir, { recursive: true })

  const templateData = {
    ...data,
    isApi: data.genType === "full" || data.genType === "service",
    isPortal: data.genType === "full" || data.genType === "portal",
    isBackoffice: data.genType === "full" || data.genType === "backoffice",
  }

  let content = `services:\n`

  content += processTemplateFile(join(templatesDir, "infra/docker-compose-block.hbs"), templateData)

  if (data.authProvider === "zitadel") {
    content += processTemplateFile(join(templatesDir, "infra/zitadel-services.hbs"), templateData)
  }

  content += processTemplateFile(join(templatesDir, "infra/docker-compose-footer.hbs"), templateData)

  writeFileSync(join(infraDir, "docker-compose.yml"), content, "utf-8")
}
