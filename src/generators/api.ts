import { join } from "node:path"
import { copyTemplateDir } from "../utils/template.js"

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname

export interface ApiGeneratorData {
  name: string
  authProvider: string
  apiPort: string
  [key: string]: unknown
}

/**
 * Generate the API backend:
 * - packages/db-{name}/
 * - packages/api-client-{name}/
 * - apps/api-{name}/
 */
export function generateApi(targetDir: string, data: ApiGeneratorData): void {
  const { name, authProvider } = data

  // packages/db
  copyTemplateDir(
    join(TEMPLATES_DIR, "packages/db/common"),
    join(targetDir, `packages/db-${name}`),
    data
  )
  copyTemplateDir(
    join(TEMPLATES_DIR, `packages/db/${authProvider}`),
    join(targetDir, `packages/db-${name}`),
    data
  )

  // packages/api-client
  copyTemplateDir(
    join(TEMPLATES_DIR, "packages/api-client"),
    join(targetDir, `packages/api-client-${name}`),
    data
  )

  // apps/api
  copyTemplateDir(
    join(TEMPLATES_DIR, "apps/api/common"),
    join(targetDir, `apps/api-${name}`),
    data
  )
  copyTemplateDir(
    join(TEMPLATES_DIR, `apps/api/${authProvider}`),
    join(targetDir, `apps/api-${name}`),
    data
  )
}
