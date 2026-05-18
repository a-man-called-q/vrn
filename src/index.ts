#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join, dirname } from "node:path"

const command = process.argv[2]

if (command === "--version" || command === "-v") {
  const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf-8"))
  console.log(pkg.version)
  process.exit(0)
}

if (command === "--help" || command === "-h") {
  console.log([
    "create-vrn — SaaS Monorepo Scaffolding",
    "",
    "Usage:",
    "  bun create vrn [name]                      Create a new project",
    "  bunx vrn gen [service|portal|backoffice]   Add an app to an existing project",
    "  bunx vrn link <source> <target>            Link two services together",
    "  bunx vrn sync                              Sync project with vrn.yaml (generate missing apps)",
    "  bunx vrn add <addon>                       Add a feature addon (subscription, ...)",
    "  bunx vrn context                           Print project state (AI-friendly)",
    "  bunx vrn doctor                            Check system requirements",
    "  bunx vrn --version                         Print version",
  ].join("\n"))
  process.exit(0)
}

const handlers: Record<string, () => Promise<void>> = {
  gen:     () => import("./commands/gen.js").then(m => m.run()),
  link:    () => import("./commands/link.js").then(m => m.run()),
  doctor:  () => import("./commands/doctor.js").then(m => m.run()),
  context: () => import("./commands/context.js").then(m => m.run()),
  skill:   () => import("./commands/skill.js").then(m => m.run()),
  mcp:     () => import("./mcp.js").then(m => m.runMcp()),
  sync:    () => import("./commands/sync.js").then(m => m.run()),
  add:     () => import("./commands/add.js").then(m => m.run()),
}

if (command && command in handlers) {
  await handlers[command]()
} else if (!command || !command.startsWith("-")) {
  await import("./commands/create.js").then(m => m.run())
} else {
  console.error(`Unknown option: ${command}. Run 'bunx vrn --help' for usage.`)
  process.exit(1)
}

export {}
