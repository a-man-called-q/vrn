import { join } from "node:path"
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs"
import { processTemplateFile } from "../utils/template.js"

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname

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

/**
 * Append a docker-compose service block to infra/docker-compose.yml
 * in the target directory. Creates the file if it doesn't exist.
 */
export function generateDocker(targetDir: string, data: DockerGeneratorData): void {
  const templatePath = join(TEMPLATES_DIR, "infra/docker-compose-block.hbs")
  const rendered = processTemplateFile(templatePath, data)

  const infraDir = join(targetDir, "infra")
  mkdirSync(infraDir, { recursive: true })

  const composePath = join(infraDir, "docker-compose.yml")
  if (existsSync(composePath)) {
    const existing = readFileSync(composePath, "utf-8")
    writeFileSync(composePath, existing + "\n" + rendered, "utf-8")
  } else {
    const header = `version: "3.8"\n\nservices:\n`
    writeFileSync(composePath, header + rendered, "utf-8")
  }
}
