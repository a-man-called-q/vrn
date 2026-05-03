#!/usr/bin/env node
import * as p from "@clack/prompts"
import { mkdirSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { generateApi } from "./generators/api.js"
import { generatePortal } from "./generators/portal.js"
import { generateBackoffice } from "./generators/backoffice.js"
import { generateDocker } from "./generators/docker.js"
import { copyTemplateDir, copyTemplateFile } from "./utils/template.js"

const TEMPLATES_DIR = new URL("../templates", import.meta.url).pathname

type GenType =
  | "Full Application Suite (API + DB + Portal + Backoffice)"
  | "API Backend Only (+ DB + Client)"
  | "Portal Only (Frontend)"
  | "Backoffice Only (Admin)"

async function main() {
  console.log()
  p.intro("create-vrn — SaaS Monorepo Scaffolding")

  const genType = await p.select<GenType>({
    message: "What do you want to generate?",
    options: [
      {
        value: "Full Application Suite (API + DB + Portal + Backoffice)",
        label: "Full Application Suite (API + DB + Portal + Backoffice)",
      },
      {
        value: "API Backend Only (+ DB + Client)",
        label: "API Backend Only (+ DB + Client)",
      },
      {
        value: "Portal Only (Frontend)",
        label: "Portal Only (Frontend)",
      },
      {
        value: "Backoffice Only (Admin)",
        label: "Backoffice Only (Admin)",
      },
    ],
  })

  if (p.isCancel(genType)) {
    p.cancel("Cancelled.")
    process.exit(0)
  }

  const name = await p.text({
    message: "Application name",
    placeholder: "my-app",
    validate(value) {
      if (!value || value.trim() === "") return "Application name is required."
    },
  })

  if (p.isCancel(name)) {
    p.cancel("Cancelled.")
    process.exit(0)
  }

  const authProvider = await p.select<"zitadel" | "better-auth">({
    message: "Auth provider",
    options: [
      {
        value: "zitadel",
        label: "Zitadel (OIDC, enterprise-grade)",
      },
      {
        value: "better-auth",
        label: "Better Auth (email/password, self-hosted)",
      },
    ],
  })

  if (p.isCancel(authProvider)) {
    p.cancel("Cancelled.")
    process.exit(0)
  }

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

  // Conditional port prompts
  let apiPort = "4001"
  let portalPort = "3001"
  let backofficePort = "5175"
  let apiSourceInput = ""

  if (isFullOrApi) {
    const apiPortInput = await p.text({
      message: "API Port",
      placeholder: "4001",
      initialValue: "4001",
    })
    if (p.isCancel(apiPortInput)) { p.cancel("Cancelled."); process.exit(0) }
    apiPort = apiPortInput || "4001"
  }

  if (isFullOrPortal) {
    const portalPortInput = await p.text({
      message: "Portal Port",
      placeholder: "3001",
      initialValue: "3001",
    })
    if (p.isCancel(portalPortInput)) { p.cancel("Cancelled."); process.exit(0) }
    portalPort = portalPortInput || "3001"
  }

  if (isFullOrBackoffice) {
    const backofficePortInput = await p.text({
      message: "Backoffice Port",
      placeholder: "5175",
      initialValue: "5175",
    })
    if (p.isCancel(backofficePortInput)) { p.cancel("Cancelled."); process.exit(0) }
    backofficePort = backofficePortInput || "5175"
  }

  // Ask for API source when only generating a frontend
  if (!isFull && !isFullOrApi && (isFullOrPortal || isFullOrBackoffice)) {
    const apiSourcePrompt = await p.text({
      message: "Which API name does this frontend connect to?",
      placeholder: "my-api",
      validate(value) {
        if (!value || value.trim() === "") return "API name is required."
      },
    })
    if (p.isCancel(apiSourcePrompt)) { p.cancel("Cancelled."); process.exit(0) }
    apiSourceInput = apiSourcePrompt
  }

  // Resolve apiSource
  const apiSource = isFullOrApi ? (name as string) : apiSourceInput

  const appName = name as string
  const targetDir = resolve(process.cwd(), appName)

  if (existsSync(targetDir)) {
    const overwrite = await p.confirm({
      message: `Directory "${appName}" already exists. Continue anyway?`,
      initialValue: false,
    })
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Cancelled.")
      process.exit(0)
    }
  }

  const data = {
    name: appName,
    authProvider: authProvider as string,
    genType: genType as string,
    apiSource,
    apiPort,
    portalPort,
    backofficePort,
  }

  const spinner = p.spinner()
  spinner.start("Scaffolding your project...")

  try {
    // Create target directory
    mkdirSync(targetDir, { recursive: true })

    // Copy base monorepo skeleton
    copyTemplateDir(
      join(TEMPLATES_DIR, "base"),
      targetDir,
      data
    )

    // Copy .gitignore separately (leading dot files)
    // Already handled by copyTemplateDir since base contains .gitignore

    // Run generators based on selection
    if (isFullOrApi) {
      generateApi(targetDir, data)
    }
    if (isFullOrPortal) {
      generatePortal(targetDir, data)
    }
    if (isFullOrBackoffice) {
      generateBackoffice(targetDir, data)
    }

    // Always generate docker block
    generateDocker(targetDir, data)

    spinner.stop("Project scaffolded successfully!")
  } catch (err) {
    spinner.stop("Failed to scaffold project.")
    console.error(err)
    process.exit(1)
  }

  p.outro(
    [
      `Done! Your project is ready at ./${appName}`,
      "",
      "Next steps:",
      `  cd ${appName}`,
      "  bun install",
      "  # Copy and fill in your .env files",
      "  bun dev",
    ].join("\n")
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
