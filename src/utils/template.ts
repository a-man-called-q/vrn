import Handlebars from "handlebars"
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  lstatSync,
  existsSync,
  copyFileSync,
} from "node:fs"
import { join, dirname, extname } from "node:path"
import { registerHelpers } from "./helpers.js"

// Register all helpers once at import time
registerHelpers()

const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".ico", ".woff", ".woff2", ".ttf", ".eot"])

// Files/dirs prefixed with [value] are only copied when data contains that value as a field.
// E.g. "[zitadel]schema.ts" is copied as "schema.ts" only when authMode === "zitadel".
const CONDITION_RE = /^\[([^\]]+)\]/

export function resolveCondition(
  name: string,
  data: Record<string, unknown>
): { skip: boolean; outputName: string } {
  const m = CONDITION_RE.exec(name)
  if (!m) return { skip: false, outputName: name }
  const condition = m[1]
  const matches = Object.values(data).some(v => v === condition)
    || data[condition] === true
  return { skip: !matches, outputName: name.slice(m[0].length) }
}

export function processTemplate(templateContent: string, data: object): string {
  const compiled = Handlebars.compile(templateContent, { noEscape: true })
  return compiled(data)
}

export function processTemplateFile(templatePath: string, data: object): string {
  const content = readFileSync(templatePath, "utf-8")
  return processTemplate(content, data)
}

export function copyTemplateFile(
  srcFile: string,
  destFile: string,
  data: object
): void {
  const rendered = processTemplateFile(srcFile, data)
  mkdirSync(dirname(destFile), { recursive: true })
  writeFileSync(destFile, rendered, "utf-8")
}

export function copyTemplateDir(
  srcDir: string,
  destDir: string,
  data: object,
  _isRoot = true
): void {
  if (!existsSync(srcDir)) return
  const entries = readdirSync(srcDir)
  for (const entry of entries) {
    if (_isRoot && entry === "_auth") continue

    const { skip, outputName } = resolveCondition(entry, data as Record<string, unknown>)
    if (skip) continue

    const srcPath = join(srcDir, entry)
    const destPath = join(destDir, outputName)
    const stat = lstatSync(srcPath)

    // Skip symlinks — templates dir is package-controlled and shouldn't contain them
    if (stat.isSymbolicLink()) continue

    if (stat.isDirectory()) {
      copyTemplateDir(srcPath, destPath, data, false)
    } else {
      mkdirSync(dirname(destPath), { recursive: true })
      if (BINARY_EXTENSIONS.has(extname(srcPath).toLowerCase())) {
        copyFileSync(srcPath, destPath)
      } else {
        const content = readFileSync(srcPath, "utf-8")
        const rendered = processTemplate(content, data)
        writeFileSync(destPath, rendered, "utf-8")
      }
    }
  }
}
