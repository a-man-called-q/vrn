import { verney } from "../../personality/index.js"
import type { RowStatus, Speech, SpeechRow } from "../../ui/index.js"

export type ItemStatus = "pending" | "running" | "done" | "skipped" | "failed"

export interface SyncItem {
  id: string
  label: string
  status: ItemStatus
  detail?: string
}

export const STATUS_TO_ROW: Record<ItemStatus, RowStatus> = {
  pending: "pending",
  running: "active",
  done: "done",
  skipped: "skipped",
  failed: "failed",
}

export function syncSpeech(projectName: string, items: SyncItem[], done: boolean): Speech {
  const synced = items.filter(i => i.id.startsWith("vrn-") && i.status === "done").length
  const generated = items.filter(i => i.id.startsWith("gen-") && i.status === "done").length
  const summary = done
    ? (synced + generated === 0
        ? verney.sync.alreadyInSync
        : verney.sync.summary(synced, generated))
    : undefined

  const rows: SpeechRow[] = items.map(item => ({
    text: item.label,
    status: STATUS_TO_ROW[item.status],
    detail: item.detail,
  }))

  const speech: Speech = {
    ask: verney.sync.intro(projectName),
    rows,
  }
  if (summary) speech.closing = summary
  return speech
}
