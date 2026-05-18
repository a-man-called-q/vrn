import * as p from "@clack/prompts"
import { execSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { PackageManager } from "../types.js"

export function unwrap<T>(value: T | symbol): T {
  if (p.isCancel(value)) { p.cancel("Cancelled."); process.exit(0) }
  return value as T
}

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

const MOON_CACHE_FILE = join(homedir(), ".cache", "create-vrn", "moon-version.json")
const MOON_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function fetchLatestMoonVersion(): Promise<string> {
  // Serve from cache if fresh
  if (existsSync(MOON_CACHE_FILE)) {
    try {
      const cached = JSON.parse(readFileSync(MOON_CACHE_FILE, "utf-8")) as {
        version: string
        cachedAt: number
      }
      if (cached.version && Date.now() - cached.cachedAt < MOON_CACHE_TTL_MS) {
        return cached.version
      }
    } catch { /* stale or corrupt cache — fall through to fetch */ }
  }

  try {
    const res = await fetch("https://api.github.com/repos/moonrepo/moon/releases/latest", {
      headers: { "User-Agent": "create-vrn" },
      signal: AbortSignal.timeout(5000),
    })
    const json = (await res.json()) as { tag_name: string }
    if (typeof json.tag_name !== "string" || !/^v?\d+\.\d+\.\d+/.test(json.tag_name)) {
      throw new Error("unexpected tag_name format")
    }
    const version = json.tag_name.replace(/^v/, "")

    mkdirSync(join(homedir(), ".cache", "create-vrn"), { recursive: true })
    writeFileSync(MOON_CACHE_FILE, JSON.stringify({ version, cachedAt: Date.now() }), "utf-8")

    return version
  } catch {
    return "2.1.4"
  }
}

export function runInstall(projectRoot: string, packageManager: string): void {
  const spinner = p.spinner()
  spinner.start("Installing dependencies...")
  const result = spawnSync(packageManager, ["install"], {
    cwd: projectRoot,
    stdio: "pipe",
  })
  if (result.status === 0) {
    spinner.stop("Dependencies installed!")
  } else {
    spinner.stop(`Install failed — run '${packageManager} install' manually.`)
  }
}

export async function detectOrAskPackageManager(): Promise<PackageManager> {
  const candidates: PackageManager[] = ["bun", "pnpm", "yarn", "npm"]
  const available: PackageManager[] = []
  for (const pm of candidates) {
    try {
      execSync(`${pm} --version`, { stdio: "pipe", timeout: 2000 })
      available.push(pm)
    } catch { /* not installed */ }
  }

  if (available.length === 1) return available[0]

  return unwrap(await p.select<PackageManager>({
    message: "Package manager",
    options: [
      { value: "bun", label: "Bun" },
      { value: "pnpm", label: "pnpm" },
      { value: "npm", label: "npm" },
      { value: "yarn", label: "Yarn" },
    ],
    initialValue: available.includes("bun") ? "bun" : (available[0] ?? "bun"),
  }))
}
