// Non-interactive (flag-driven) entry: `vrn gen service --name x --port 4002`.
// Drives runGen directly without spinning up Ink — used by CI/scripted callers.

import { runGen, type AppType } from "../../actions/gen.js"
import type { ProjectConfig } from "../../types.js"

export function parseLinks(flags: Record<string, string>): string[] | undefined {
  const raw = flags["links"] ?? flags["api-source"]
  if (raw === undefined) return undefined
  return raw.split(",").map(s => s.trim()).filter(Boolean)
}

export function runNonInteractive(
  appType: AppType,
  flags: Record<string, string>,
  projectRoot: string,
  config: ProjectConfig,
): void {
  try {
    const app = runGen(
      {
        type: appType,
        name: flags["name"]!,
        framework: flags["framework"] as "elysia" | "litestar" | undefined,
        port: flags["port"],
        links: parseLinks(flags),
      },
      projectRoot,
      config,
    )
    process.stdout.write(`done — ${app.dirName}\n`)
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`)
    process.exit(1)
  }
}
