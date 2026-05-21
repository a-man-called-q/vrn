import { generateApp } from "../generators/index.js"
import { regenerateDocker } from "../generators/docker/index.js"
import { writeProjectConfig } from "../utils/project.js"
import { runInstallQuiet } from "../utils/pm.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import { linkAll } from "./link.js"
import type { AppEntry, ProjectConfig, ServiceFramework } from "../types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

const NAME_RE = /^[a-z][a-z0-9-]*$/

export type AppType = "service" | "portal" | "backoffice"

const DEFAULT_PORTS: Record<AppType, string> = {
  service: "4001",
  portal: "3001",
  backoffice: "5175",
}

export interface GenAppParams {
  type: AppType
  name: string
  framework?: ServiceFramework
  port?: string
  links?: string[]
}

function buildApp(params: GenAppParams): AppEntry {
  const { type, name, port } = params
  const resolvedPort = port ?? DEFAULT_PORTS[type]

  if (type === "service") {
    return {
      name,
      type: "service",
      dirName: `${name}-service`,
      serviceFramework: params.framework ?? "elysia",
      port: resolvedPort,
    }
  }

  return {
    name,
    type,
    dirName: type === "portal" ? `portal-${name}` : `backoffice-${name}`,
    port: resolvedPort,
    apiSource: params.links?.[0],
  }
}

// Throws a descriptive string on validation failure.
export function runGen(
  params: GenAppParams,
  projectRoot: string,
  config: ProjectConfig,
): AppEntry {
  const { type, name } = params

  if (!name || name.trim() === "") throw new Error("--name is required")
  if (!NAME_RE.test(name)) throw new Error("--name: lowercase letters, numbers, and hyphens only")
  if (config.apps.some(a => a.type === type && a.name === name)) {
    throw new Error(`a ${type} named "${name}" already exists`)
  }

  if (params.port) {
    const n = Number(params.port)
    if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("--port must be 1–65535")
  }

  if (type === "service") {
    const fw = params.framework ?? "elysia"
    if (fw !== "elysia" && fw !== "litestar") {
      throw new Error("--framework must be elysia or litestar")
    }
  }

  const app = buildApp(params)
  const next: ProjectConfig = { ...config, apps: [...config.apps, app] }

  generateApp(projectRoot, TEMPLATES_DIR, app, next)
  regenerateDocker(projectRoot, TEMPLATES_DIR, next)
  writeProjectConfig(projectRoot, next)
  linkAll(projectRoot, next, app, params.links ?? [])
  runInstallQuiet(projectRoot, config.packageManagers.js.name)

  return app
}
