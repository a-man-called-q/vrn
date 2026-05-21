import { useEffect, useState } from "react"
import { render, useApp } from "ink"
import { execSync } from "node:child_process"

import { Bubble, type Speech, type SpeechRow } from "../ui/index.js"
import { verney } from "../personality/index.js"

interface Tool {
  name: string
  label: string
  cmd: string
  required: boolean
}

interface CheckResult extends Tool {
  installed: boolean
  version?: string
}

const REQUIRED_TOOLS: Tool[] = [
  { name: "bun", label: "bun", cmd: "bun --version", required: true },
  { name: "node", label: "node.js", cmd: "node --version", required: true },
  { name: "moon", label: "moon", cmd: "moon --version", required: true },
  { name: "proto", label: "proto", cmd: "proto --version", required: true },
]

const OPTIONAL_TOOLS: Tool[] = [
  { name: "docker", label: "docker", cmd: "docker --version", required: false },
  { name: "python3", label: "python", cmd: "python3 --version", required: false },
  { name: "uv", label: "uv", cmd: "uv --version", required: false },
]

const PM_TOOLS: Tool[] = [
  { name: "npm", label: "npm", cmd: "npm --version", required: false },
  { name: "pnpm", label: "pnpm", cmd: "pnpm --version", required: false },
  { name: "yarn", label: "yarn", cmd: "yarn --version", required: false },
]

function check(tool: Tool): CheckResult {
  try {
    const raw = execSync(tool.cmd, { stdio: "pipe", timeout: 3000 }).toString().trim()
    const match = raw.match(/\d+\.\d+[\.\d]*/)
    return { ...tool, installed: true, version: match ? match[0] : raw.split("\n")[0] }
  } catch {
    return { ...tool, installed: false }
  }
}

interface Section {
  title: string
  items: CheckResult[]
}

function toRow(res: CheckResult): SpeechRow {
  if (res.installed) {
    return { text: res.label, status: "done", detail: res.version }
  }
  if (res.required) {
    return { text: res.label, status: "failed", detail: "not installed" }
  }
  return { text: res.label, status: "skipped", detail: "not found" }
}

function DoctorApp() {
  const { exit } = useApp()
  const [phase, setPhase] = useState<"checking" | "done">("checking")
  const [sections, setSections] = useState<Section[]>([])
  const [missing, setMissing] = useState<CheckResult[]>([])

  useEffect(() => {
    const required = REQUIRED_TOOLS.map(check)
    const optional = OPTIONAL_TOOLS.map(check)
    const pms = PM_TOOLS.map(check)
    setSections([
      { title: verney.doctor.sectionRequired, items: required },
      { title: verney.doctor.sectionOptional, items: optional },
      { title: verney.doctor.sectionPackageManagers, items: pms },
    ])
    setMissing(required.filter(r => !r.installed))
    setPhase("done")
  }, [])

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => exit(), 50)
      return () => clearTimeout(t)
    }
  }, [phase, exit])

  if (phase === "checking") {
    return (
      <Bubble
        active
        speech={{
          ask: verney.doctor.intro,
          status: verney.doctor.checking,
        }}
      />
    )
  }

  return <Bubble active={missing.length > 0} speech={summarySpeech(sections, missing)} />
}

export function summarySpeech(sections: Section[], missing: CheckResult[]): Speech {
  // Sections render as a single flat row list with blank separator rows.
  const rows: SpeechRow[] = []
  sections.forEach((section, idx) => {
    if (idx > 0) rows.push({ text: "" })
    rows.push({ text: section.title })
    for (const item of section.items) rows.push(toRow(item))
  })

  const speech: Speech = { ask: verney.doctor.intro, rows }
  if (missing.length === 0) {
    speech.closing = verney.doctor.ready
    return speech
  }
  speech.warn = verney.doctor.missing(missing.map(m => m.label).join(", "))
  const hints: string[] = []
  if (missing.some(m => m.name === "moon" || m.name === "proto")) hints.push(verney.doctor.hint.moonProto)
  if (missing.some(m => m.name === "bun")) hints.push(verney.doctor.hint.bun)
  if (missing.some(m => m.name === "node")) hints.push(verney.doctor.hint.node)
  if (hints.length > 0) speech.details = hints
  return speech
}

export async function run(): Promise<void> {
  const { waitUntilExit } = render(<DoctorApp />)
  await waitUntilExit()
}
