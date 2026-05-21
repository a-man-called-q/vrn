import { spawnSync } from "node:child_process"

export interface InstallResult {
  ok: boolean
  exitCode: number | null
}

export function runInstallQuiet(projectRoot: string, packageManager: string): InstallResult {
  const result = spawnSync(packageManager, ["install"], {
    cwd: projectRoot,
    stdio: "pipe",
  })
  return { ok: result.status === 0, exitCode: result.status }
}
