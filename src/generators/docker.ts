import { join } from "node:path"
import { writeFileSync, mkdirSync } from "node:fs"
import { processTemplateFile } from "../utils/template.js"

const TEMPLATES_DIR = new URL("../templates", import.meta.url).pathname

export interface DockerGeneratorData {
  name: string
  authProvider: string
  genType: string
  apiSource: string
  apiPort?: string
  portalPort?: string
  backofficePort?: string
  [key: string]: unknown
}

export function generateDocker(targetDir: string, data: DockerGeneratorData): void {
  const infraDir = join(targetDir, "infra")
  mkdirSync(infraDir, { recursive: true })

  let content = `version: "3.8"\n\nservices:\n`

  content += processTemplateFile(join(TEMPLATES_DIR, "infra/docker-compose-block.hbs"), data)

  if (data.authProvider === "zitadel") {
    content += processTemplateFile(join(TEMPLATES_DIR, "infra/zitadel-services.hbs"), data)
  }

  content += processTemplateFile(join(TEMPLATES_DIR, "infra/docker-compose-footer.hbs"), data)

  writeFileSync(join(infraDir, "docker-compose.yml"), content, "utf-8")
}
