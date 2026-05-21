import type { AppEntry } from "../../types.js"
import type { AppType } from "../../actions/gen.js"

export type Phase =
  | { kind: "menu" }
  | { kind: "wizard"; appType: AppType }
  | { kind: "generating"; app: AppEntry; picks: string[] }
  | { kind: "installing" }
  | { kind: "done" }
  | { kind: "error"; message: string }

export const DEFAULT_PORTS: Record<AppType, string> = {
  service: "4001",
  portal: "3001",
  backoffice: "5175",
}
