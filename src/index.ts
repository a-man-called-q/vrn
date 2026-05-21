#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join, dirname, basename } from "node:path"

const binName = basename(process.argv[1] ?? "")
const isCreateMode = binName.startsWith("create-")

const command = process.argv[2]

if (command === "--version" || command === "-v") {
  const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf-8"))
  console.log(pkg.version)
  process.exit(0)
}

const HELP = [
  "vrn — SaaS Monorepo Scaffolding",
  "",
  "Usage:",
  "  bunx create-vrn [name]                     Create a new project",
  "  vrn create [name]                          Create a new project",
  "  vrn gen [service|portal|backoffice]        Add an app to an existing project",
  "  vrn link <source> <target>                 Link two services together",
  "  vrn sync                                   Sync project with vrn.yaml",
  "  vrn add <addon>                            Add a feature addon (subscription, ...)",
  "  vrn context                                Print project state (AI-friendly)",
  "  vrn doctor                                 Check system requirements",
  "  vrn --version                              Print version",
].join("\n")

if (command === "--help" || command === "-h") {
  console.log(HELP)
  process.exit(0)
}

const handlers: Record<string, () => Promise<void>> = {
  create:  () => import("./commands/create.js").then(m => m.run()),
  gen:     () => import("./commands/gen.js").then(m => m.run()),
  link:    () => import("./commands/link.js").then(m => m.run()),
  doctor:  () => import("./commands/doctor.js").then(m => m.run()),
  context: () => import("./commands/context.js").then(m => m.run()),
  skill:   () => import("./commands/skill.js").then(m => m.run()),
  mcp:     () => import("./mcp.js").then(m => m.runMcp()),
  sync:    () => import("./commands/sync.js").then(m => m.run()),
  add:     () => import("./commands/add.js").then(m => m.run()),
}

if (isCreateMode) {
  await import("./commands/create.js").then(m => m.run())
} else if (command && command in handlers) {
  await handlers[command]()
} else if (!command) {
  console.log(HELP)
} else {
  console.error(`Unknown command: ${command}. Run 'vrn --help' for usage.`)
  process.exit(1)
}

export {}
