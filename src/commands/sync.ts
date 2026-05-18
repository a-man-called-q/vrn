import * as p from "@clack/prompts"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { requireProjectRoot, readProjectConfig } from "../utils/project.js"
import { buildTemplateData } from "../utils/template-data.js"
import { generateApp } from "../generators/index.js"
import { regenerateDocker } from "../generators/docker.js"
import { copyTemplateDir } from "../utils/template.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import { AppEntry, ProjectConfig } from "../types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

function appExists(projectRoot: string, app: AppEntry): boolean {
  return existsSync(join(projectRoot, "apps", app.dirName))
}

function syncVrn(projectRoot: string, app: AppEntry, config: ProjectConfig): void {
  if (app.type !== "service") return
  const data = buildTemplateData(app, config)
  const templateBase = app.serviceFramework === "litestar"
    ? "apps/api-python/src/_vrn"
    : "apps/api/src/_vrn"
  copyTemplateDir(
    join(TEMPLATES_DIR, templateBase),
    join(projectRoot, "apps", app.dirName, "src", "_vrn"),
    data
  )
}

export function run(): void {
  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)

  console.log()
  p.intro(`vrn sync — ${config.name}`)

  const missing = config.apps.filter(a => !appExists(projectRoot, a))
  const existing = config.apps.filter(a => appExists(projectRoot, a))

  // Regenerate _vrn/ in existing service apps
  for (const app of existing.filter(a => a.type === "service")) {
    const spinner = p.spinner()
    spinner.start(`syncing _vrn/  ${app.dirName}...`)
    try {
      syncVrn(projectRoot, app, config)
      spinner.stop(`synced _vrn/   ${app.dirName}`)
    } catch (err) {
      spinner.stop(`failed         ${app.dirName}/_vrn`)
      console.error(err)
    }
  }

  // Skip non-service existing apps (no _vrn/ yet)
  for (const app of existing.filter(a => a.type !== "service")) {
    p.log.info(`skip  ${app.dirName}  (no _vrn/ for ${app.type})`)
  }

  // Generate fully missing apps
  for (const app of missing) {
    const spinner = p.spinner()
    spinner.start(`generating ${app.dirName}...`)
    try {
      generateApp(projectRoot, TEMPLATES_DIR, app, config)
      spinner.stop(`generated  ${app.dirName}`)
    } catch (err) {
      spinner.stop(`failed     ${app.dirName}`)
      console.error(err)
    }
  }

  // Always regenerate wiring files
  const dockerSpinner = p.spinner()
  dockerSpinner.start("regenerating docker-compose.yml...")
  try {
    regenerateDocker(projectRoot, TEMPLATES_DIR, config)
    dockerSpinner.stop("regenerated docker-compose.yml")
  } catch (err) {
    dockerSpinner.stop("failed to regenerate docker-compose.yml")
    console.error(err)
  }

  const synced = existing.filter(a => a.type === "service").length
  if (missing.length === 0 && synced === 0) {
    p.outro("Already in sync.")
  } else {
    const parts = []
    if (synced > 0) parts.push(`${synced} _vrn/ synced`)
    if (missing.length > 0) parts.push(`${missing.length} app(s) generated`)
    p.outro(`Done! ${parts.join(", ")}.`)
  }
}
