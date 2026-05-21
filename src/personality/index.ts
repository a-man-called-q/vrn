import * as content from "./verney.js"
import type { StepVoice } from "./voice.js"

export type { StepVoice, ConfirmVoice, ConfirmKey } from "./voice.js"

// `verney` is the namespaced view of all content — same shape callers
// expect (verney.steps.auth, verney.scaffolding, ...).
export const verney = {
  greetings: content.greetings,
  steps: content.steps,
  dyn: content.dyn,
  scaffolding: content.scaffolding,
  jsPmProbe: content.jsPmProbe,
  gen: content.gen,
  link: content.link,
  sync: content.sync,
  add: content.add,
  doctor: content.doctor,
  events: content.events,
}

// ─── helpers ──────────────────────────────────────────────────────────

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function greet(name?: string): string {
  if (name) {
    const line = pick(content.greetings.withName)
    return line(name)
  }
  return pick(content.greetings.withoutName)
}

export function ack(): string {
  return pick(content.events.ack)
}

export function backReact(): string {
  return pick(content.events.back)
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

type StepId = keyof typeof content.steps

export function react<K extends StepId>(step: K, value: string): string {
  const voice = content.steps[step] as StepVoice<string>
  return voice.reactions?.[value] ?? ack()
}

export function hover<K extends StepId>(step: K, value: string): string | undefined {
  const voice = content.steps[step] as StepVoice<string>
  return voice.hover?.[value]
}
