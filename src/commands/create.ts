import * as p from "@clack/prompts"
import { mkdirSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"
import { generateBase } from "../generators/base.js"
import { writeProjectConfig } from "../utils/project.js"
import {
  detectOrAskPackageManager,
  detectPmVersion,
  fetchLatestMoonVersion,
  unwrap,
} from "../utils/cli.js"
import { ProjectConfig } from "../types.js"

import { resolveTemplatesDir } from "../utils/paths.js"
const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

// `bun create vrn my-app` passes the project name as the first non-flag arg
const nameArg = process.argv.slice(2).find(a => !a.startsWith("-") && a !== "create")
const noGit = process.argv.includes("--no-git")

export async function run(): Promise<void> {
  console.log()
  p.intro("create-vrn — SaaS Monorepo Scaffolding")

  // Kick off moon version fetch in the background while the user answers prompts
  const latestMoonVersionPromise = fetchLatestMoonVersion()

  const name = unwrap(await p.text({
    message: "Application name",
    placeholder: "my-saas",
    initialValue: nameArg ?? "",
    validate(value) {
      if (!value || value.trim() === "") return "Application name is required."
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
      }
      if (value.length > 64) return "Name must be 64 characters or less."
    },
  }))

  const targetDir = resolve(process.cwd(), name)
  if (existsSync(targetDir)) {
    p.cancel(`Directory "${name}" already exists. Remove it first or choose a different name.`)
    process.exit(1)
  }

  const useZitadel = unwrap(await p.confirm({
    message: "Use Zitadel instead of local auth?",
    initialValue: true,
  }))

  const multiTenant = unwrap(await p.confirm({
    message: "Multi-tenant? (multiple organizations sharing one deployment)",
    initialValue: false,
  }))

  const packageManager = await detectOrAskPackageManager()
  const packageManagerVersion = detectPmVersion(packageManager)

  const moonVersion = await latestMoonVersionPromise
  p.log.info(`Using moon ${moonVersion}`)

  let config: ProjectConfig = {
    name,
    packageManager,
    packageManagerVersion,
    moonVersion,
    useZitadel,
    multiTenant,
    addons: [],
    apps: [],
  }

  const scaffoldSpinner = p.spinner()
  scaffoldSpinner.start("Scaffolding base monorepo...")

  try {
    mkdirSync(targetDir, { recursive: true })
    generateBase(targetDir, TEMPLATES_DIR, config)
    writeProjectConfig(targetDir, config)

    if (!noGit) {
      execSync("git init", { cwd: targetDir, stdio: "pipe" })
    }

    scaffoldSpinner.stop("Base monorepo created!")
  } catch (err) {
    scaffoldSpinner.stop("Failed to scaffold project.")
    console.error(err)
    process.exit(1)
  }

  p.outro([
    `Done! Your project is ready at ./${name}`,
    "",
    "Next steps:",
    `  cd ${name}`,
    "  bunx vrn gen service    # add a service (API backend)",
    "  bunx vrn gen portal     # add a portal (end-user frontend)",
    "  bunx vrn gen backoffice # add a backoffice (admin dashboard)",
  ].join("\n"))
}
