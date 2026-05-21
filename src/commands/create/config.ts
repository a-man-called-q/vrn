// Pure builders for the create-command: name validation, ProbeResult shape,
// and the answer→ProjectConfig translation.

import { NPM_FALLBACK_VERSION, type ProbeBreakdown } from "../../utils/probe.js"
import type {
  JsPackageManager,
  PythonPackageManager,
  RustPackageManager,
  PackageManagers,
  ProjectConfig,
} from "../../types.js"

const NAME_RE = /^[a-z][a-z0-9-]*$/

export function validateName(value: string): string | undefined {
  if (!value || value.trim() === "") return "name is required"
  if (!NAME_RE.test(value)) {
    return "lowercase letters, numbers, and hyphens only — must start with a letter"
  }
  if (value.length > 64) return "name must be 64 characters or less"
}

export interface ProbeResult {
  js: ProbeBreakdown<JsPackageManager>
  python: ProbeBreakdown<PythonPackageManager>
  rust: ProbeBreakdown<RustPackageManager>
  moonVersion: string
}

export function buildConfig(
  answers: Record<string, unknown>,
  probe: ProbeResult,
): ProjectConfig {
  const name = answers["name"] as string
  const auth = answers["auth"] as "local" | "zitadel"
  const tenant = answers["tenant"] as "single" | "multi"
  const jsPmName = answers["jsPm"] as JsPackageManager

  const jsHit = probe.js.found.find(f => f.name === jsPmName)
  const jsPm = jsHit ?? {
    name: jsPmName,
    version: jsPmName === "npm" ? NPM_FALLBACK_VERSION : "unknown",
  }

  const packageManagers: PackageManagers = { js: jsPm }
  if (answers["python"]) {
    const py = probe.python.found[0]
    if (py) packageManagers.python = py
  }
  if (answers["rust"]) {
    const rs = probe.rust.found[0]
    if (rs) packageManagers.rust = rs
  }

  return {
    name,
    packageManagers,
    moonVersion: probe.moonVersion,
    useZitadel: auth === "zitadel",
    multiTenant: tenant === "multi",
    addons: [],
    apps: [],
  }
}
