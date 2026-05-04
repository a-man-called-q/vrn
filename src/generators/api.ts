import { join } from "node:path"
import { copyTemplateDir } from "../utils/template.js"
import { ScaffoldData } from "../types.js"

/**
 * Generate the API backend:
 * - packages/db-{name}/
 * - packages/{name}-service-client/
 * - apps/{name}-service/
 */
export function generateApi(
  targetDir: string,
  templatesDir: string,
  data: ScaffoldData
): void {
  const { name, authProvider, serviceFramework } = data

  if (serviceFramework === "litestar") {
    copyTemplateDir(
      join(templatesDir, "apps/api-python"),
      join(targetDir, `apps/${name}-service`),
      data
    )
    copyTemplateDir(
      join(templatesDir, "packages/api-client-litestar"),
      join(targetDir, `packages/${name}-service-client`),
      data
    )
  } else {
    copyTemplateDir(
      join(templatesDir, "packages/db"),
      join(targetDir, `packages/db-${name}`),
      data
    )
    copyTemplateDir(
      join(templatesDir, "packages/api-client"),
      join(targetDir, `packages/${name}-service-client`),
      data
    )
    copyTemplateDir(
      join(templatesDir, "apps/api"),
      join(targetDir, `apps/${name}-service`),
      data
    )
  }
}
