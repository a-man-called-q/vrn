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

const TEMPLATES_DIR = new URL("../templates", import.meta.url).pathname

type GenType =
  | "Full Application Suite (API + DB + Portal + Backoffice)"
  | "API Backend Only (+ DB + Client)"
  | "Portal Only (Frontend)"
  | "Backoffice Only (Admin)"

type PackageManager = "bun" | "npm" | "pnpm" | "yarn"

function detectPmVersion(pm: PackageManager): string {
  const defaults: Record<PackageManager, string> = {
    bun: "1.3.10",
    npm: "10.9.2",
    pnpm: "10.0.0",
    yarn: "4.6.0",
  }
  try {
    const raw = execSync(`${pm} --version`, { stdio: "pipe", timeout: 3000 }).toString().trim()
    const match = raw.match(/\d+\.\d+\.\d+/)
    return match ? match[0] : defaults[pm]
  } catch {
    return defaults[pm]
  }
}

function detectMoonVersion(): string | null {
  try {
    const raw = execSync("moon --version", { stdio: "pipe", timeout: 3000 }).toString().trim()
    const match = raw.match(/\d+\.\d+\.\d+/)
    return match ? match[0] : null
  } catch {
    return null
  }
}

async function fetchLatestMoonVersion(): Promise<string> {
  try {
    const res = await fetch("https://api.github.com/repos/moonrepo/moon/releases/latest", {
      headers: { "User-Agent": "create-vrn" },
    })
    const json = (await res.json()) as { tag_name: string }
    return json.tag_name.replace(/^v/, "")
  } catch {
    return "2.1.4"
  }
}

async function main() {
  console.log()
  p.intro("create-vrn — SaaS Monorepo Scaffolding")

  // Start fetching latest moon version in background while user answers prompts
  const latestMoonVersionPromise = fetchLatestMoonVersion()

  const genType = await p.select<GenType>({
    message: "What do you want to generate?",
    options: [
      { value: "Full Application Suite (API + DB + Portal + Backoffice)", label: "Full Application Suite (API + DB + Portal + Backoffice)" },
      { value: "API Backend Only (+ DB + Client)", label: "Service Backend Only (+ DB + Client)" },
      { value: "Portal Only (Frontend)", label: "Portal Only (Frontend)" },
      { value: "Backoffice Only (Admin)", label: "Backoffice Only (Admin)" },
    ],
  })
  if (p.isCancel(genType)) { p.cancel("Cancelled."); process.exit(0) }

  const name = await p.text({
    message: "Application name",
    placeholder: "my-app",
    validate(value) {
      if (!value || value.trim() === "") return "Application name is required."
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

  const pm = packageManager as PackageManager
  const packageManagerVersion = detectPmVersion(pm)

  const isFullOrApi =
    genType === "Full Application Suite (API + DB + Portal + Backoffice)" ||
    genType === "API Backend Only (+ DB + Client)"
  const isFullOrPortal =
    genType === "Full Application Suite (API + DB + Portal + Backoffice)" ||
    genType === "Portal Only (Frontend)"
  const isFullOrBackoffice =
    genType === "Full Application Suite (API + DB + Portal + Backoffice)" ||
    genType === "Backoffice Only (Admin)"
  const isFull =
    genType === "Full Application Suite (API + DB + Portal + Backoffice)"

  let apiPort = "4001"
  let portalPort = "3001"
  let backofficePort = "5175"
  let apiSourceInput = ""

  if (isFullOrApi) {
    const v = await p.text({ message: "Service port", placeholder: "4001", initialValue: "4001" })
    if (p.isCancel(v)) { p.cancel("Cancelled."); process.exit(0) }
    apiPort = v || "4001"
  }

  if (isFullOrPortal) {
    const v = await p.text({ message: "Portal port", placeholder: "3001", initialValue: "3001" })
    if (p.isCancel(v)) { p.cancel("Cancelled."); process.exit(0) }
    portalPort = v || "3001"
  }

  if (isFullOrBackoffice) {
    const v = await p.text({ message: "Backoffice port", placeholder: "5175", initialValue: "5175" })
    if (p.isCancel(v)) { p.cancel("Cancelled."); process.exit(0) }
    backofficePort = v || "5175"
  }

  if (!isFull && !isFullOrApi && (isFullOrPortal || isFullOrBackoffice)) {
    const v = await p.text({
      message: "Which service name does this frontend connect to?",
      placeholder: "my-app",
      validate(value) {
        if (!value || value.trim() === "") return "Service name is required."
      },
    })
    if (p.isCancel(v)) { p.cancel("Cancelled."); process.exit(0) }
    apiSourceInput = v
  }

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

  const apiSource = isFullOrApi ? (name as string) : apiSourceInput
  const appName = name as string
  const targetDir = resolve(process.cwd(), appName)

  if (existsSync(targetDir)) {
    const overwrite = await p.confirm({
      message: `Directory "${appName}" already exists. Continue anyway?`,
      initialValue: false,
    })
    if (p.isCancel(overwrite) || !overwrite) { p.cancel("Cancelled."); process.exit(0) }
  }

  const data = {
    name: appName,
    authProvider: authProvider as string,
    genType: genType as string,
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

    if (isFullOrApi) generateApi(targetDir, data)
    if (isFullOrPortal) generatePortal(targetDir, data)
    if (isFullOrBackoffice) generateBackoffice(targetDir, data)

    generateDocker(targetDir, data)

    if (initGit as boolean) {
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
