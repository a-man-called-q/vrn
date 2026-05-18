import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import yaml from "yaml"
import { ProjectConfig } from "../types.js"

const MANIFEST_FILE = "vrn.yaml"
const VALID_PACKAGE_MANAGERS = new Set(["bun", "npm", "pnpm", "yarn"])
const NAME_RE = /^[a-z][a-z0-9-]*$/

export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let dir = startDir
  while (true) {
    if (existsSync(join(dir, MANIFEST_FILE))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function readProjectConfig(projectRoot: string): ProjectConfig {
  const content = readFileSync(join(projectRoot, MANIFEST_FILE), "utf-8")
  const config = yaml.parse(content)
  if (!config || typeof config !== "object" || !config.name || !Array.isArray(config.apps)) {
    throw new Error(`${MANIFEST_FILE} is malformed. Expected 'name' and 'apps' fields.`)
  }
  if (typeof config.name !== "string" || !NAME_RE.test(config.name)) {
    throw new Error(`${MANIFEST_FILE}: invalid 'name' (must match ${NAME_RE}).`)
  }
  if (!VALID_PACKAGE_MANAGERS.has(config.packageManager)) {
    throw new Error(`${MANIFEST_FILE}: invalid 'packageManager' (must be one of: ${[...VALID_PACKAGE_MANAGERS].join(", ")}).`)
  }
  for (const app of config.apps) {
    if (typeof app?.name !== "string" || !NAME_RE.test(app.name)) {
      throw new Error(`${MANIFEST_FILE}: invalid app name '${app?.name}' (must match ${NAME_RE}).`)
    }
    if (typeof app.dirName !== "string" || !NAME_RE.test(app.dirName)) {
      throw new Error(`${MANIFEST_FILE}: invalid app dirName '${app.dirName}' (must match ${NAME_RE}).`)
    }
    if (app.apiSource !== undefined && (typeof app.apiSource !== "string" || !NAME_RE.test(app.apiSource))) {
      throw new Error(`${MANIFEST_FILE}: invalid apiSource '${app.apiSource}' in ${app.name} (must match ${NAME_RE}).`)
    }
  }
  return config as ProjectConfig
}

export function writeProjectConfig(projectRoot: string, config: ProjectConfig): void {
  writeFileSync(join(projectRoot, MANIFEST_FILE), yaml.stringify(config), "utf-8")
}

export function requireProjectRoot(startDir?: string): string {
  const root = findProjectRoot(startDir)
  if (!root) {
    console.error("Not inside a VRN project. Run `bun create vrn <name>` to create one.")
    process.exit(1)
  }
  return root
}
