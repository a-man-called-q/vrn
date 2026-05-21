// Aggregates the per-command voice files into a single `verney` namespace
// and exposes the lookup helpers (reactionFor/hoverFor/recapFor/greet/ack/…)
// that callers use to pull text in a type-safe way.

import * as create from "./voices/create.js"
import { gen } from "./voices/gen.js"
import { link } from "./voices/link.js"
import { sync } from "./voices/sync.js"
import { add } from "./voices/add.js"
import { doctor } from "./voices/doctor.js"
import { events } from "./voices/events.js"
import type { StepVoice } from "./types.js"

export type { StepVoice, ConfirmVoice, ConfirmKey } from "./types.js"

export const verney = {
  greetings: create.greetings,
  steps: create.steps,
  dyn: create.dyn,
  scaffolding: create.scaffolding,
  jsPmProbe: create.jsPmProbe,
  gen,
  link,
  sync,
  add,
  doctor,
  events,
}

// ─── helpers ──────────────────────────────────────────────────────────

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function greet(name?: string): string {
  if (name) {
    const line = pick(create.greetings.withName)
    return line(name)
  }
  return pick(create.greetings.withoutName)
}

export function ack(): string {
  return pick(events.ack)
}

export function backReact(): string {
  return pick(events.back)
}

// Look up a reaction/hover/recap for a StepVoice in a type-safe way.
export function reactionFor<K extends string>(
  voice: StepVoice<K>,
  value: K,
): string | undefined {
  return voice.reactions?.[value]
}

export function hoverFor<K extends string>(
  voice: StepVoice<K>,
  value: K,
): string | undefined {
  return voice.hover?.[value]
}

export function recapFor<K extends string>(
  voice: StepVoice<K>,
  value: K,
  ...extras: unknown[]
): string | undefined {
  return voice.recap?.(value, ...extras)
}

// ─── legacy named exports kept thin for callers that destructure ──────
// (eventual goal: callers go through reactionFor/hoverFor instead.)

type StepId = keyof typeof create.steps

export function react<K extends StepId>(step: K, value: string): string {
  const voice = create.steps[step] as StepVoice<string>
  return voice.reactions?.[value] ?? ack()
}

export function hover<K extends StepId>(step: K, value: string): string | undefined {
  const voice = create.steps[step] as StepVoice<string>
  return voice.hover?.[value]
}
