import Handlebars from "handlebars"
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs"
import { join, dirname } from "node:path"
import { registerHelpers } from "./helpers.js"

// Register all helpers once at import time
registerHelpers()

/**
 * Process a Handlebars template string with the provided data.
 */
export function processTemplate(templateContent: string, data: object): string {
  const compiled = Handlebars.compile(templateContent, { noEscape: true })
  return compiled(data)
}

/**
 * Process a template file and return the rendered string.
 */
export function processTemplateFile(templatePath: string, data: object): string {
  const content = readFileSync(templatePath, "utf-8")
  return processTemplate(content, data)
}

/**
 * Copy a single template file to a destination, processing it through Handlebars.
 */
export function copyTemplateFile(
  srcFile: string,
  destFile: string,
  data: object
): void {
  const rendered = processTemplateFile(srcFile, data)
  mkdirSync(dirname(destFile), { recursive: true })
  writeFileSync(destFile, rendered, "utf-8")
}

/**
 * Recursively copy all files from srcDir to destDir, processing each through
 * Handlebars. Skips any top-level directory named `_auth`.
 */
export function copyTemplateDir(
  srcDir: string,
  destDir: string,
  data: object,
  _isRoot = true
): void {
  if (!existsSync(srcDir)) return
  const entries = readdirSync(srcDir)
  for (const entry of entries) {
    // Skip the _auth directory at root level
    if (_isRoot && entry === "_auth") continue

    const srcPath = join(srcDir, entry)
    const destPath = join(destDir, entry)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      copyTemplateDir(srcPath, destPath, data, false)
    } else {
      mkdirSync(dirname(destPath), { recursive: true })
      const content = readFileSync(srcPath, "utf-8")
      const rendered = processTemplate(content, data)
      writeFileSync(destPath, rendered, "utf-8")
    }
  }
}
