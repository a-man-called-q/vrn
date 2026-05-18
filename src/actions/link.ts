import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { ProjectConfig } from "../types.js"
import { writeProjectConfig } from "../utils/project.js"

export type LinkResult =
  | { ok: true; addedDep: boolean; clientPkg: string; servicePkgPath: string }
  | { ok: false; reason: "self-link" | "already-linked" | "source-not-found" | "target-not-found" }

export function linkServices(
  projectRoot: string,
  config: ProjectConfig,
  source: string,
  target: string
): LinkResult {
  if (source === target) return { ok: false, reason: "self-link" }

  const sourceApp = config.apps.find(a => a.name === source && a.type === "service")
  if (!sourceApp) return { ok: false, reason: "source-not-found" }

  const targetApp = config.apps.find(a => a.name === target && a.type === "service")
  if (!targetApp) return { ok: false, reason: "target-not-found" }

  if (sourceApp.links?.includes(target)) return { ok: false, reason: "already-linked" }

  sourceApp.links = [...(sourceApp.links ?? []), target]
  writeProjectConfig(projectRoot, config)

  const clientPkg = `@workspace/${target}-service-client`
  const servicePkgPath = join(projectRoot, "apps", sourceApp.dirName, "package.json")
  let addedDep = false

  if (existsSync(servicePkgPath)) {
    const pkg = JSON.parse(readFileSync(servicePkgPath, "utf-8")) as {
      dependencies?: Record<string, string>
    }
    if (!pkg.dependencies?.[clientPkg]) {
      pkg.dependencies = { ...pkg.dependencies, [clientPkg]: "workspace:*" }
      writeFileSync(servicePkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
      addedDep = true
    }
  }

  return { ok: true, addedDep, clientPkg, servicePkgPath }
}
