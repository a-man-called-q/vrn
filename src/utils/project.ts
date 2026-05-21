import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import yaml from "yaml"
import { ProjectConfig } from "../types.js"

const MANIFEST_FILE = "vrn.yaml"
const VALID_JS_PMS = new Set(["bun", "npm", "pnpm", "yarn"])
const VALID_PY_PMS = new Set(["uv", "pip"])
const VALID_RUST_PMS = new Set(["cargo"])
const NAME_RE = /^[a-z][a-z0-9-]*$/

function validatePmEntry(
  entry: unknown,
  field: string,
  validNames: Set<string>,
): asserts entry is { name: string; version: string } {
  if (!entry || typeof entry !== "object") {
    throw new Error(`${MANIFEST_FILE}: '${field}' must be an object with 'name' and 'version'.`)
  }
  const e = entry as { name?: unknown; version?: unknown }
  if (typeof e.name !== "string" || !validNames.has(e.name)) {
    throw new Error(`${MANIFEST_FILE}: invalid '${field}.name' (must be one of: ${[...validNames].join(", ")}).`)
  }
  if (typeof e.version !== "string" || e.version.trim() === "") {
    throw new Error(`${MANIFEST_FILE}: '${field}.version' must be a non-empty string.`)
  }
}

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
  if (!config.packageManagers || typeof config.packageManagers !== "object") {
    throw new Error(`${MANIFEST_FILE}: missing 'packageManagers' object (with 'js', optional 'python', optional 'rust').`)
  }
  validatePmEntry(config.packageManagers.js, "packageManagers.js", VALID_JS_PMS)
  if (config.packageManagers.python !== undefined) {
    validatePmEntry(config.packageManagers.python, "packageManagers.python", VALID_PY_PMS)
  }
  if (config.packageManagers.rust !== undefined) {
    validatePmEntry(config.packageManagers.rust, "packageManagers.rust", VALID_RUST_PMS)
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
