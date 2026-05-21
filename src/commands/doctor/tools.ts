// Tool inventory the doctor checks. `name` doubles as the binary name we
// invoke with --version (via probe.ts).

import { probeOne } from "../../utils/probe.js"
import type { RowStatus, SpeechRow } from "../../ui/index.js"

export interface Tool {
  name: string
  label: string
  required: boolean
}

export interface CheckResult extends Tool {
  installed: boolean
  version?: string
}

export interface Section {
  title: string
  items: CheckResult[]
}

export const REQUIRED_TOOLS: Tool[] = [
  { name: "bun", label: "bun", required: true },
  { name: "node", label: "node.js", required: true },
  { name: "moon", label: "moon", required: true },
  { name: "proto", label: "proto", required: true },
]

export const OPTIONAL_TOOLS: Tool[] = [
  { name: "docker", label: "docker", required: false },
  { name: "python3", label: "python", required: false },
  { name: "uv", label: "uv", required: false },
]

export const PM_TOOLS: Tool[] = [
  { name: "npm", label: "npm", required: false },
  { name: "pnpm", label: "pnpm", required: false },
  { name: "yarn", label: "yarn", required: false },
]

export async function checkTool(tool: Tool): Promise<CheckResult> {
  const res = await probeOne(tool.name, { timeout: 3000 })
  if (res.kind === "found") return { ...tool, installed: true, version: res.version }
  return { ...tool, installed: false }
}

export async function checkAll(): Promise<Section[]> {
  const [required, optional, pms] = await Promise.all([
    Promise.all(REQUIRED_TOOLS.map(checkTool)),
    Promise.all(OPTIONAL_TOOLS.map(checkTool)),
    Promise.all(PM_TOOLS.map(checkTool)),
  ])
  return [
    { title: "required", items: required },
    { title: "optional", items: optional },
    { title: "package managers", items: pms },
  ]
}

const STATUS_MAP: Record<"ok" | "missingRequired" | "missingOptional", RowStatus> = {
  ok: "done",
  missingRequired: "failed",
  missingOptional: "skipped",
}

export function toRow(res: CheckResult): SpeechRow {
  if (res.installed) return { text: res.label, status: STATUS_MAP.ok, detail: res.version }
  if (res.required) return { text: res.label, status: STATUS_MAP.missingRequired, detail: "not installed" }
  return { text: res.label, status: STATUS_MAP.missingOptional, detail: "not found" }
}
