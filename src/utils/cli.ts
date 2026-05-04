import * as p from "@clack/prompts"
import { execSync } from "node:child_process"
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

export function detectMoonVersion(): string | null {
  try {
    const raw = execSync("moon --version", { stdio: "pipe", timeout: 3000 }).toString().trim()
    const match = raw.match(/\d+\.\d+\.\d+/)
    return match ? match[0] : null
  } catch {
    return null
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

export async function askText(
  message: string,
  defaultValue: string,
  condition = true
): Promise<string> {
  if (!condition) return defaultValue

  const v = await p.text({
    message,
    placeholder: defaultValue,
    initialValue: defaultValue,
  })
  if (p.isCancel(v)) {
    p.cancel("Cancelled.")
    process.exit(0)
  }
  return v || defaultValue
}

export async function askRequiredText(
  message: string,
  placeholder: string,
  errorMessage: string,
  condition = true
): Promise<string> {
  if (!condition) return ""

  const v = await p.text({
    message,
    placeholder,
    validate(value) {
      if (!value || value.trim() === "") return errorMessage
    },
  })
  if (p.isCancel(v)) {
    p.cancel("Cancelled.")
    process.exit(0)
  }
  return v
}
