import { verney } from "../../personality/index.js"
import type { Speech } from "../../ui/index.js"

export type Phase =
  | { kind: "installing" }
  | { kind: "done" }
  | { kind: "error"; message: string }

export function phaseSpeech(phase: Phase, addonName: string): Speech {
  switch (phase.kind) {
    case "installing":
      return {
        ask: verney.add.intro(addonName),
        status: verney.add.installing(addonName),
      }
    case "error":
      return {
        ask: verney.add.intro(addonName),
        error: verney.add.failed(addonName),
        details: [phase.message],
      }
    case "done":
      return {
        ask: verney.add.intro(addonName),
        closing: verney.add.installed(addonName),
        details: ["", verney.add.nextSteps],
      }
  }
}
