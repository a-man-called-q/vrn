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
} from "../utils/cli.js"
import { ProjectConfig } from "../types.js"
import { runGen } from "./gen.js"

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname

// `bun create vrn my-app` passes the project name as the first non-flag arg
const nameArg = process.argv.slice(2).find(a => !a.startsWith("-") && a !== "create")
const noGit = process.argv.includes("--no-git")

export async function run(): Promise<void> {
  console.log()
  p.intro("create-vrn — SaaS Monorepo Scaffolding")

  // Kick off moon version fetch in the background while the user answers prompts
  const latestMoonVersionPromise = fetchLatestMoonVersion()

  const name = await p.text({
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
  })
  if (p.isCancel(name)) { p.cancel("Cancelled."); process.exit(0) }

  const targetDir = resolve(process.cwd(), name as string)
  if (existsSync(targetDir)) {
    p.cancel(`Directory "${name}" already exists. Remove it first or choose a different name.`)
    process.exit(1)
  }

  const useZitadelResult = await p.confirm({
    message: "Use Zitadel as identity provider?",
    initialValue: true,
  })
  if (p.isCancel(useZitadelResult)) { p.cancel("Cancelled."); process.exit(0) }
  const useZitadel = useZitadelResult as boolean

  const packageManager = await detectOrAskPackageManager(process.cwd())
  const packageManagerVersion = detectPmVersion(packageManager)

  const moonVersion = await latestMoonVersionPromise
  p.log.info(`Using moon ${moonVersion}`)

  let config: ProjectConfig = {
    name: name as string,
    packageManager,
    packageManagerVersion,
    moonVersion,
    useZitadel,
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

  // Chain into gen loop so users can add apps in the same session
  while (true) {
    const choice = await p.select({
      message: "Add an app to your project?",
      options: [
        { value: "service", label: "Service (API backend)" },
        { value: "portal", label: "Portal (end-user frontend)" },
        { value: "backoffice", label: "Backoffice (admin dashboard)" },
        { value: "skip", label: "Done — I'll add apps later with `bunx vrn gen`" },
      ],
    })

    if (p.isCancel(choice) || choice === "skip") break

    config = await runGen(
      targetDir,
      choice as "service" | "portal" | "backoffice",
      config,
      TEMPLATES_DIR
    )
  }

  p.outro([
    `Done! Your project is ready at ./${name}`,
    "",
    "Next steps:",
    `  cd ${name}`,
    "  # Copy and fill in your .env files",
    `  ${packageManager} dev`,
    "",
    "Add more apps any time:",
    "  bunx vrn gen service",
    "  bunx vrn gen portal",
  ].join("\n"))
}
