import type { JsPackageManager, ProjectConfig } from "../../types.js"
import type { Step } from "../../ui/index.js"

import type { ProbeResult } from "./config.js"

export type Phase =
  | { kind: "probe" }
  | { kind: "wizard"; probe: ProbeResult; steps: Step[] }
  | { kind: "resolving"; probe: ProbeResult; answers: Record<string, unknown>; tool: JsPackageManager }
  | { kind: "scaffold"; config: ProjectConfig; targetDir: string }
  | { kind: "done"; name: string }
  | { kind: "error"; message: string }
  | { kind: "cancelled" }
