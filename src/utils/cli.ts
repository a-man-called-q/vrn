import * as p from "@clack/prompts"
import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { PackageManager } from "../types.js"

export function detectPmVersion(pm: PackageManager): string {
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



export async function fetchLatestMoonVersion(): Promise<string> {
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

export async function detectOrAskPackageManager(
  cwd: string = process.cwd()
): Promise<PackageManager> {
  // Detect from lockfiles first
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) return "bun"
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn"
  if (existsSync(join(cwd, "package-lock.json"))) return "npm"

  // Check which package manager binaries are available
  const candidates: PackageManager[] = ["bun", "pnpm", "yarn", "npm"]
  const available: PackageManager[] = []
  for (const pm of candidates) {
    try {
      execSync(`${pm} --version`, { stdio: "pipe", timeout: 2000 })
      available.push(pm)
    } catch { /* not installed */ }
  }

  if (available.length === 1) return available[0]

  const result = await p.select<PackageManager>({
    message: "Package manager",
    options: [
      { value: "bun", label: "Bun" },
      { value: "pnpm", label: "pnpm" },
      { value: "npm", label: "npm" },
      { value: "yarn", label: "Yarn" },
    ],
    initialValue: available.includes("bun") ? "bun" : (available[0] ?? "bun"),
  })
  if (p.isCancel(result)) { p.cancel("Cancelled."); process.exit(0) }
  return result
}

