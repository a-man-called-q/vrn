import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import yaml from "yaml"
import { ProjectConfig } from "../types.js"

const MANIFEST_FILE = ".vrn.yaml"

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
  return config as ProjectConfig
}

export function writeProjectConfig(projectRoot: string, config: ProjectConfig): void {
  writeFileSync(join(projectRoot, MANIFEST_FILE), yaml.stringify(config), "utf-8")
}
