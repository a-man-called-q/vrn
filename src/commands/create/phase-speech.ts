// Pure mapping from a (non-wizard) Phase to the Speech verney delivers.
// Kept separate from rendering so it's trivially testable.

import { verney } from "../../personality/index.js"
import type { Speech } from "../../ui/index.js"

import type { Phase } from "./types.js"

export function phaseSpeech(phase: Exclude<Phase, { kind: "wizard" }>): Speech {
  switch (phase.kind) {
    case "probe":
      return {
        ask: "let me see what you've got installed",
        status: "sniffing toolchain",
      }
    case "resolving":
      return {
        ask: verney.jsPmProbe.retryAsk(phase.tool),
        status: "giving it 6s this time",
      }
    case "scaffold":
      return {
        ask: verney.scaffolding.start,
        status: `writing ./${phase.config.name}`,
      }
    case "done":
      return {
        closing: verney.scaffolding.done(phase.name),
        details: [
          "",
          "next steps:",
          `  → cd ${phase.name}`,
          `  → bunx vrn gen service     # backend api`,
          `  → bunx vrn gen portal      # end-user frontend`,
          `  → bunx vrn gen backoffice  # admin dashboard`,
          "",
          verney.scaffolding.nextSteps,
        ],
      }
    case "error":
      return {
        error: verney.scaffolding.failed,
        details: [phase.message],
      }
    case "cancelled":
      return { ask: verney.events.cancelled }
  }
}

export function isActivePhase(phase: Exclude<Phase, { kind: "wizard" }>): boolean {
  return phase.kind === "probe"
    || phase.kind === "resolving"
    || phase.kind === "scaffold"
    || phase.kind === "error"
}
