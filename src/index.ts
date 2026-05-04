#!/usr/bin/env node
import * as p from "@clack/prompts"
import { mkdirSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { execSync, spawnSync } from "node:child_process"
import { generateApi } from "./generators/api.js"
import { generatePortal } from "./generators/portal.js"
import { generateBackoffice } from "./generators/backoffice.js"
import { generateDocker } from "./generators/docker.js"
import { copyTemplateDir } from "./utils/template.js"
import {
  detectPmVersion,
  detectMoonVersion,
  fetchLatestMoonVersion,
  askText,
  askRequiredText,
} from "./utils/cli.js"
import { GenType, PackageManager, ScaffoldData } from "./types.js"

const TEMPLATES_DIR = new URL("../templates", import.meta.url).pathname

async function main() {
  console.log()
  p.intro("create-vrn — SaaS Monorepo Scaffolding")

  // Start fetching latest moon version in background while user answers prompts
  const latestMoonVersionPromise = fetchLatestMoonVersion()

  const genType = await p.select<GenType>({
    message: "What do you want to generate?",
    options: [
      { value: "full", label: "Full Application Suite (Service + DB + Portal + Backoffice)" },
      { value: "service", label: "Service Backend Only (+ DB + Client)" },
      { value: "portal", label: "Portal Only (Frontend)" },
      { value: "backoffice", label: "Backoffice Only (Admin)" },
    ],
  })
  if (p.isCancel(genType)) { p.cancel("Cancelled."); process.exit(0) }

  const name = await p.text({
    message: "Application name",
    placeholder: "my-app",
    validate(value) {
      if (!value || value.trim() === "") return "Application name is required."
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
      if (value.length > 64) return "Name must be 64 characters or less."
    },
  })
  if (p.isCancel(name)) { p.cancel("Cancelled."); process.exit(0) }

  const authProvider = await p.select<"zitadel" | "better-auth">({
    message: "Auth provider",
    options: [
      { value: "zitadel", label: "Zitadel (OIDC, enterprise-grade)" },
      { value: "better-auth", label: "Better Auth (email/password, self-hosted)" },
    ],
  })
  if (p.isCancel(authProvider)) { p.cancel("Cancelled."); process.exit(0) }

  const packageManager = await p.select<PackageManager>({
    message: "Package manager",
    options: [
      { value: "bun", label: "Bun" },
      { value: "pnpm", label: "pnpm" },
      { value: "npm", label: "npm" },
      { value: "yarn", label: "Yarn" },
    ],
  })
  if (p.isCancel(packageManager)) { p.cancel("Cancelled."); process.exit(0) }

  const pm = packageManager

  const packageManagerVersion = detectPmVersion(pm)

  const isFullOrApi = genType === "full" || genType === "service"
  const isFullOrPortal = genType === "full" || genType === "portal"
  const isFullOrBackoffice = genType === "full" || genType === "backoffice"

  const apiPort = await askText("Service port", "4001", isFullOrApi)
  const portalPort = await askText("Portal port", "3001", isFullOrPortal)
  const backofficePort = await askText("Backoffice port", "5175", isFullOrBackoffice)

  const apiSourceInput = await askRequiredText(
    "Which service name does this frontend connect to?",
    "my-app",
    "Service name is required.",
    !isFullOrApi && (isFullOrPortal || isFullOrBackoffice)
  )

  const initGit = await p.confirm({ message: "Initialize a git repository?", initialValue: true })
  if (p.isCancel(initGit)) { p.cancel("Cancelled."); process.exit(0) }

  // Moon version — await the background fetch now
  const latestMoonVersion = await latestMoonVersionPromise
  const installedMoonVersion = detectMoonVersion()
  let moonVersion = latestMoonVersion

  if (installedMoonVersion && installedMoonVersion !== latestMoonVersion) {
    const choice = await p.select({
      message: `Moon version (installed: ${installedMoonVersion}, latest: ${latestMoonVersion})`,
      options: [
        { value: installedMoonVersion, label: `Keep installed  (${installedMoonVersion})` },
        { value: latestMoonVersion, label: `Use latest  (${latestMoonVersion})` },
      ],
    })
    if (p.isCancel(choice)) { p.cancel("Cancelled."); process.exit(0) }
    moonVersion = choice as string
  } else if (installedMoonVersion) {
    moonVersion = installedMoonVersion
  }

  const apiSource = isFullOrApi ? name : apiSourceInput
  const appName = name

  const targetDir = resolve(process.cwd(), appName)

  if (existsSync(targetDir)) {
    const overwrite = await p.confirm({
      message: `Directory "${appName}" already exists. Continue anyway?`,
      initialValue: false,
    })
    if (p.isCancel(overwrite) || !overwrite) { p.cancel("Cancelled."); process.exit(0) }
  }

  const data: ScaffoldData = {
    name: appName,
    authProvider,
    genType,
    apiSource,
    apiPort,
    portalPort,
    backofficePort,
    packageManager: pm,
    packageManagerVersion,
    moonVersion,
  }

  const scaffoldSpinner = p.spinner()
  scaffoldSpinner.start("Scaffolding your project...")

  try {
    mkdirSync(targetDir, { recursive: true })
    copyTemplateDir(join(TEMPLATES_DIR, "base"), targetDir, data)

    if (isFullOrApi) generateApi(targetDir, TEMPLATES_DIR, data)
    if (isFullOrPortal) generatePortal(targetDir, TEMPLATES_DIR, data)
    if (isFullOrBackoffice) generateBackoffice(targetDir, TEMPLATES_DIR, data)

    generateDocker(targetDir, TEMPLATES_DIR, data)

    if (initGit) {
      execSync("git init", { cwd: targetDir, stdio: "pipe" })
      execSync("git add .", { cwd: targetDir, stdio: "pipe" })
    }

    scaffoldSpinner.stop("Project scaffolded!")
  } catch (err) {
    scaffoldSpinner.stop("Failed to scaffold project.")
    console.error(err)
    process.exit(1)
  }

  const installSpinner = p.spinner()
  installSpinner.start(`Installing dependencies with ${pm}...`)

  const installResult = spawnSync(pm, ["install"], {
    cwd: targetDir,
    stdio: "pipe",
    shell: true,
  })

  if (installResult.status === 0) {
    installSpinner.stop("Dependencies installed!")
  } else {
    installSpinner.stop(`Install failed — run '${pm} install' manually inside ./${appName}`)
  }

  p.outro(
    [
      `Done! Your project is ready at ./${appName}`,
      "",
      "Next steps:",
      `  cd ${appName}`,
      "  # Copy and fill in your .env files",
      `  ${pm} dev`,
    ].join("\n")
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
