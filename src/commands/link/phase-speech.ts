import { verney } from "../../personality/index.js"
import type { Speech } from "../../ui/index.js"

export type Phase =
  | { kind: "linking" }
  | { kind: "installing"; addedDep: string; clientPkg: string; servicePkgPath: string }
  | { kind: "done"; addedDep?: { clientPkg: string; servicePkgPath: string } }
  | { kind: "warn"; message: string }
  | { kind: "error"; message: string }

export function phaseSpeech(phase: Phase, source: string, target: string): Speech {
  switch (phase.kind) {
    case "linking":
      return {
        ask: verney.link.intro(source, target),
        status: "wiring it up",
      }
    case "installing":
      return {
        ask: verney.link.intro(source, target),
        details: [verney.link.addedDep(phase.clientPkg, phase.servicePkgPath)],
        status: verney.link.installing,
      }
    case "warn":
      return { warn: phase.message }
    case "error":
      return { error: phase.message }
    case "done": {
      const details: string[] = []
      if (phase.addedDep) {
        details.push(verney.link.addedDep(phase.addedDep.clientPkg, phase.addedDep.servicePkgPath))
      }
      return {
        ask: verney.link.intro(source, target),
        details,
        closing: verney.link.success(source, target),
      }
    }
  }
}

export function isActivePhase(phase: Phase): boolean {
  return phase.kind === "linking" || phase.kind === "installing"
}
