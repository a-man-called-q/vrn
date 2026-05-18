import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export function resolveTemplatesDir(importMetaUrl: string): string {
  const dir = dirname(fileURLToPath(importMetaUrl))
  // src/commands/ → ../../templates (source run)
  // dist/         → ../templates    (built run)
  const candidates = [
    resolve(dir, "../templates"),
    resolve(dir, "../../templates"),
  ]
  const found = candidates.find(p => existsSync(p))
  if (!found) throw new Error(`templates/ directory not found (searched: ${candidates.join(", ")})`)
  return found
}
