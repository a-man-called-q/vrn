import { existsSync, readFileSync, appendFileSync } from "node:fs"
import { join } from "node:path"
import { copyTemplateDir } from "../utils/template.js"
import { buildTemplateData } from "../utils/template-data.js"
import { ProjectConfig } from "../types.js"

const ENV_VARS = `
# Stripe (added by vrn add subscription)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
`

export const name = "subscription"
export const description = "Stripe-powered subscription billing with plans and webhooks"

export function install(
  projectRoot: string,
  templatesDir: string,
  config: ProjectConfig
): void {
  const services = config.apps.filter(a => a.type === "service" && a.serviceFramework === "elysia")

  for (const service of services) {
    const data = buildTemplateData(service, config)

    copyTemplateDir(
      join(templatesDir, "packages/db/src"),
      join(projectRoot, `packages/db-${service.name}/src`),
      data
    )

    copyTemplateDir(
      join(templatesDir, "apps/api/src/routes"),
      join(projectRoot, `apps/${service.dirName}/src/routes`),
      data
    )

    copyTemplateDir(
      join(templatesDir, "apps/api/src/_vrn"),
      join(projectRoot, `apps/${service.dirName}/src/_vrn`),
      data
    )
  }

  const envFile = join(projectRoot, ".env.example")
  if (existsSync(envFile)) {
    const existing = readFileSync(envFile, "utf-8")
    if (!existing.includes("STRIPE_SECRET_KEY")) {
      appendFileSync(envFile, ENV_VARS, "utf-8")
    }
  }
}
