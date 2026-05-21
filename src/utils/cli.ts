import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import {
  JsPackageManager,
  PythonPackageManager,
  RustPackageManager,
} from "../types.js"

const execFileP = promisify(execFile)

export const JS_CANDIDATES: JsPackageManager[] = ["bun", "pnpm", "yarn", "npm"]
export const PYTHON_CANDIDATES: PythonPackageManager[] = ["uv", "pip"]
export const RUST_CANDIDATES: RustPackageManager[] = ["cargo"]

// Fallback version used only when no JS PM is detected at all.
export const NPM_FALLBACK_VERSION = "10.9.2"

export type ProbeOneResult =
  | { kind: "found"; version: string }
  | { kind: "missing" }
  | { kind: "timeout" }
  | { kind: "error"; message: string }

export async function probeOne(
  cmd: string,
  opts: { timeout?: number; signal?: AbortSignal } = {},
): Promise<ProbeOneResult> {
  return probeVersion(cmd, { timeout: opts.timeout ?? 2000, signal: opts.signal })
}

async function probeVersion(
  cmd: string,
  opts: { timeout: number; signal?: AbortSignal } = { timeout: 2000 },
): Promise<ProbeOneResult> {
  try {
    const { stdout } = await execFileP(cmd, ["--version"], {
      timeout: opts.timeout,
      signal: opts.signal,
    })
    const raw = stdout.trim()
    const match = raw.match(/\d+\.\d+\.\d+/)
    return { kind: "found", version: match ? match[0] : raw.split("\n")[0] }
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { killed?: boolean; signal?: string; name?: string }
    if (e.code === "ENOENT") return { kind: "missing" }
    if (e.killed || e.signal === "SIGTERM" || e.name === "AbortError") return { kind: "timeout" }
    return { kind: "error", message: e.message ?? "unknown error" }
  }
}

export interface Probed<Name extends string> {
  name: Name
  version: string
}

export interface ProbeBreakdown<Name extends string> {
  found: Probed<Name>[]
  timedOut: Name[]
  errored: { name: Name; message: string }[]
}

export async function probeCandidates<Name extends string>(
  candidates: readonly Name[],
): Promise<ProbeBreakdown<Name>> {
  const results = await Promise.all(
    candidates.map(async name => ({ name, res: await probeVersion(name, { timeout: 2000 }) })),
  )
  const breakdown: ProbeBreakdown<Name> = { found: [], timedOut: [], errored: [] }
  for (const { name, res } of results) {
    if (res.kind === "found") breakdown.found.push({ name, version: res.version })
    else if (res.kind === "timeout") breakdown.timedOut.push(name)
    else if (res.kind === "error") breakdown.errored.push({ name, message: res.message })
    // "missing" → silently skipped
  }
  return breakdown
}

const MOON_CACHE_FILE = join(homedir(), ".cache", "create-vrn", "moon-version.json")
const MOON_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export async function fetchLatestMoonVersion(): Promise<string> {
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
