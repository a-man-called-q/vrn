import { verney } from "../../personality/index.js"
import type { Speech, SpeechRow } from "../../ui/index.js"

import { toRow, type CheckResult, type Section } from "./tools.js"

export function summarySpeech(sections: Section[], missing: CheckResult[]): Speech {
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
