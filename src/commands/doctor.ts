import * as p from "@clack/prompts"
import { execSync } from "node:child_process"

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

interface Tool {
  name: string
  label: string
  cmd: string
  required: boolean
}

interface CheckResult extends Tool {
  installed: boolean
  version?: string
}

function check(tool: Tool): CheckResult {
  try {
    const raw = execSync(tool.cmd, { stdio: "pipe", timeout: 3000 }).toString().trim()
    const match = raw.match(/\d+\.\d+[\.\d]*/)
    return { ...tool, installed: true, version: match ? match[0] : raw.split("\n")[0] }
  } catch {
    return { ...tool, installed: false }
  }
}

export async function run(): Promise<void> {
  console.log()
  p.intro("vrn doctor — System Check")

  const spinner = p.spinner()
  spinner.start("Checking tools...")

  const allTools: Tool[] = [
    { name: "bun",     label: "Bun",     cmd: "bun --version",     required: true },
    { name: "node",    label: "Node.js", cmd: "node --version",    required: true },
    { name: "moon",    label: "Moon",    cmd: "moon --version",    required: true },
    { name: "proto",   label: "Proto",   cmd: "proto --version",   required: true },
    { name: "docker",  label: "Docker",  cmd: "docker --version",  required: false },
    { name: "python3", label: "Python",  cmd: "python3 --version", required: false },
    { name: "uv",      label: "uv",      cmd: "uv --version",      required: false },
  ]

  const pmTools: Tool[] = [
    { name: "npm",  label: "npm",  cmd: "npm --version",  required: false },
    { name: "pnpm", label: "pnpm", cmd: "pnpm --version", required: false },
    { name: "yarn", label: "yarn", cmd: "yarn --version", required: false },
  ]

  const results = allTools.map(check)
  const pmResults = pmTools.map(check)

  spinner.stop("Done.")

  const required = results.filter(r => r.required)
  const optional = results.filter(r => !r.required)
  const colWidth = Math.max(...results.map(r => r.label.length), ...pmResults.map(r => r.label.length))

  const row = (res: CheckResult) => {
    const name = res.label.padEnd(colWidth)
    const status = res.installed
      ? dim(res.version!)
      : res.required ? "not installed" : dim("not found")
    return `${name}  ${status}`
  }

  p.log.step(bold("Required"))
  for (const r of required) {
    if (r.installed) p.log.success(row(r))
    else p.log.error(row(r))
  }

  p.log.step(bold("Optional"))
  for (const r of optional) {
    if (r.installed) p.log.success(row(r))
    else p.log.step(row(r))
  }

  p.log.step(bold("Package Managers"))
  for (const pm of pmResults) {
    if (pm.installed) p.log.success(row(pm))
    else p.log.step(row(pm))
  }

  const missing = required.filter(r => !r.installed)

  if (missing.length > 0) {
    const hints: string[] = []
    if (missing.some(m => m.name === "moon" || m.name === "proto")) {
      hints.push("Moon & Proto   curl -fsSL https://moonrepo.dev/install/moon.sh | bash")
    }
    if (missing.some(m => m.name === "bun")) {
      hints.push("Bun            curl -fsSL https://bun.sh/install | bash")
    }
    if (missing.some(m => m.name === "node")) {
      hints.push("Node.js        https://nodejs.org")
    }
    p.note(hints.join("\n"), `Action Required — missing: ${missing.map(m => m.label).join(", ")}`)
  } else {
    p.note("All required tools found. You're good to go!", "Ready")
  }

  p.outro("Doctor check finished.")
}
