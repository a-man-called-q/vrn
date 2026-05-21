import { verney, hoverFor } from "../../personality/index.js"
import type { AppEntry } from "../../types.js"
import type { Speech } from "../../ui/index.js"

import type { Phase } from "./types.js"

export function menuSpeech(
  projectName: string,
  addedApps: AppEntry[],
  menuHover?: string,
): Speech {
  const pickType = verney.gen.pickType
  const hov = menuHover
    ? hoverFor(pickType, menuHover as "service" | "portal" | "backoffice" | "done")
    : undefined
  return {
    mood: { text: verney.gen.intro(projectName) },
    recap: addedApps.length > 0 ? addedApps.map(a => a.dirName).join(", ") : undefined,
    ask: pickType.ask,
    hover: hov,
    hint: hov ? undefined : pickType.hint,
  }
}

export function phaseSpeech(
  phase: Exclude<Phase, { kind: "menu" } | { kind: "wizard" }>,
  jsPm: string,
  addedApps: AppEntry[],
): Speech {
  switch (phase.kind) {
    case "generating":
      return {
        ask: verney.gen.generating(phase.app.type),
        status: `apps/${phase.app.dirName}`,
      }
    case "installing":
      return {
        ask: verney.gen.installing,
        status: `${jsPm} install`,
      }
    case "done":
      return {
        recap: addedApps.length > 0
          ? addedApps.map(a => a.dirName).join(", ")
          : undefined,
        closing: verney.gen.done,
      }
    case "error":
      return {
        error: verney.gen.failed("app"),
        details: [phase.message],
      }
  }
}

export function isActivePhase(phase: Phase): boolean {
  return phase.kind === "generating"
    || phase.kind === "installing"
    || phase.kind === "error"
}
