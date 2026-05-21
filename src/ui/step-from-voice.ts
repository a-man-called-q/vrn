// Builders that turn a StepVoice (from personality/voices) into a concrete
// wizard Step, wiring up reaction/hover/recap via the typed lookups in
// personality/index.ts.
//
// Removes the boilerplate of writing the same `v => reactionFor(voice, v as K)
// ?? ack()` triplet at every call-site.

import { ack, hoverFor, reactionFor, recapFor } from "../personality/index.js"
import type { StepVoice, ConfirmVoice, ConfirmKey } from "../personality/index.js"
import type {
  ConfirmStep,
  SelectStep,
  TextStep,
} from "./wizard-core.js"

export interface SelectFromVoiceOpts<K extends string> {
  id: string
  label?: string
  options: { value: K; label: string }[]
  initialValue?: K
  display?: (v: K) => string
  preset?: { value: K; message?: string }
  skipIf?: (answers: Record<string, unknown>) => boolean
  // Override hint/reaction/recap inline if the voice isn't enough. Used by
  // jsPm where the display string needs the live version.
  hint?: string
  reaction?: (v: K) => string
  recap?: (v: K) => string | undefined
}

// Returns SelectStep<string> rather than SelectStep<K> so the call site
// can place the result directly in a Step[] — V appears in callback
// parameters, so a narrow SelectStep<K> is not assignable to the wider
// SelectStep<string> the union expects. Narrowing happens inside the
// reaction/hover/recap callbacks via reactionFor's typed lookup.
export function selectStepFromVoice<K extends string>(
  voice: StepVoice<K>,
  opts: SelectFromVoiceOpts<K>,
): SelectStep<string> {
  const reaction = opts.reaction
  const display = opts.display
  const recap = opts.recap
  return {
    kind: "select",
    id: opts.id,
    label: opts.label ?? opts.id,
    prompt: voice.ask,
    hint: opts.hint ?? voice.hint,
    options: opts.options,
    initialValue: opts.initialValue,
    reaction: v => (reaction ?? (k => reactionFor(voice, k) ?? ack()))(v as K),
    hoverComment: v => hoverFor(voice, v as K),
    display: v => (display ?? (k => k))(v as K),
    recap: v => (recap ?? (k => recapFor(voice, k)))(v as K),
    preset: opts.preset,
    skipIf: opts.skipIf,
  }
}

export interface ConfirmFromVoiceOpts {
  id: string
  label?: string
  yesLabel?: string
  noLabel?: string
  initialValue?: boolean
  display?: (v: boolean) => string
  recap?: (v: boolean) => string | undefined
  hint?: string
  preset?: { value: boolean; message?: string }
}

export function confirmStepFromVoice(
  voice: ConfirmVoice,
  opts: ConfirmFromVoiceOpts,
): ConfirmStep {
  const key = (v: boolean): ConfirmKey => (v ? "yes" : "no")
  return {
    kind: "confirm",
    id: opts.id,
    label: opts.label ?? opts.id,
    prompt: voice.ask,
    hint: opts.hint ?? voice.hint,
    yesLabel: opts.yesLabel,
    noLabel: opts.noLabel,
    initialValue: opts.initialValue,
    reaction: v => reactionFor(voice, key(v)) ?? ack(),
    hoverComment: v => hoverFor(voice, key(v)),
    display: opts.display ?? (v => (v ? "yes" : "no")),
    recap: opts.recap,
    preset: opts.preset,
  }
}

export interface TextFromVoiceOpts {
  id: string
  label?: string
  placeholder?: string
  validate?: (s: string) => string | undefined
  reaction?: (v: string) => string
  display?: (v: string) => string
  recap?: (v: string) => string | undefined
  hint?: string
  preset?: { value: string; message?: string }
}

export function textStepFromVoice(
  voice: StepVoice,
  opts: TextFromVoiceOpts,
): TextStep {
  return {
    kind: "text",
    id: opts.id,
    label: opts.label ?? opts.id,
    prompt: voice.ask,
    hint: opts.hint ?? voice.hint,
    placeholder: opts.placeholder,
    validate: opts.validate,
    reaction: opts.reaction ?? (() => ack()),
    display: opts.display ?? (v => v),
    recap: opts.recap ?? (v => recapFor(voice, v) ?? v),
    preset: opts.preset,
  }
}
