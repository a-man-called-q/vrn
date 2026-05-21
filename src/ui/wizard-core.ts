// Pure state machine and speech derivation for the Wizard.
// React-free — testable in isolation. Wizard.tsx wraps these in a hook
// and renders the result.

import type { Speech } from "./Speech.js"

// ─── Step shape ───────────────────────────────────────────────────────

interface BaseStep<V> {
  id: string
  label: string
  prompt: string
  hint?: string
  // string rendered next to the answer when shown in a summary.
  display?: (v: V) => string
  // verney's short reaction once the value is committed.
  reaction?: (v: V) => string
  // verney's live commentary while the user is hovering this option,
  // before they commit. only used by select/confirm steps.
  hoverComment?: (v: V) => string | undefined
  // tiny phrase used in the waiter-style running recap, e.g. "local auth".
  recap?: (v: V) => string | undefined
  preset?: { value: V; message?: string }
  skipIf?: (answers: Record<string, unknown>) => boolean
}

export interface TextStep extends BaseStep<string> {
  kind: "text"
  placeholder?: string
  validate?: (s: string) => string | undefined
}

export interface ConfirmStep extends BaseStep<boolean> {
  kind: "confirm"
  initialValue?: boolean
  yesLabel?: string
  noLabel?: string
}

export interface SelectStep<V extends string = string> extends BaseStep<V> {
  kind: "select"
  options: { value: V; label: string }[]
  initialValue?: V
}

export interface MultiSelectStep extends BaseStep<string[]> {
  kind: "multiselect"
  // Resolved at render time so options can depend on prior answers.
  resolveOptions: (answers: Record<string, unknown>) => { value: string; label: string }[]
  initialValue?: string[]
}

export type Step =
  | TextStep
  | ConfirmStep
  | SelectStep<string>
  | MultiSelectStep

// ─── State machine ────────────────────────────────────────────────────

export type Mood =
  | { kind: "intro" }
  | { kind: "react"; line: string }
  | { kind: "back"; line: string }

export interface WizardSnapshot {
  idx: number
  answers: Record<string, unknown>
  mood: Mood
  hovered: unknown
  done: boolean
}

export function initialSnapshot(): WizardSnapshot {
  return {
    idx: 0,
    answers: {},
    mood: { kind: "intro" },
    hovered: undefined,
    done: false,
  }
}

// Returns the previous active step's idx (skipping skipIf and preset-resolved
// steps). Null if there's no previous step you can rewind to.
export function findPrevActiveIdx(
  steps: Step[],
  idx: number,
  answers: Record<string, unknown>,
): number | null {
  for (let i = idx - 1; i >= 0; i--) {
    const s = steps[i]!
    if (s.skipIf?.(answers)) continue
    if (s.preset && answers[s.id] !== undefined) continue
    return i
  }
  return null
}

// Tiny phrases for the waiter recap of committed steps before `idx`.
export function recapParts(
  steps: Step[],
  idx: number,
  answers: Record<string, unknown>,
): string[] {
  const parts: string[] = []
  for (let i = 0; i < idx; i++) {
    const s = steps[i]!
    if (s.skipIf?.(answers)) continue
    const raw = answers[s.id]
    if (raw === undefined) continue
    const phrase = s.recap?.(raw as never)
    if (phrase) parts.push(phrase)
  }
  return parts
}

// Reducer transitions. Each returns a new snapshot.

export function commitStep(
  snap: WizardSnapshot,
  step: Step,
  value: unknown,
  line: string,
): WizardSnapshot {
  return {
    ...snap,
    answers: { ...snap.answers, [step.id]: value },
    mood: { kind: "react", line },
    hovered: undefined,
    idx: snap.idx + 1,
  }
}

export function applyPreset(
  snap: WizardSnapshot,
  step: Step,
  value: unknown,
  line: string,
): WizardSnapshot {
  return {
    ...snap,
    answers: { ...snap.answers, [step.id]: value },
    mood: { kind: "react", line },
    idx: snap.idx + 1,
  }
}

// Skip the current step entirely without committing an answer (used when
// skipIf is true).
export function advanceSkip(snap: WizardSnapshot): WizardSnapshot {
  return { ...snap, idx: snap.idx + 1 }
}

export function jumpBack(
  snap: WizardSnapshot,
  steps: Step[],
  line: string,
): WizardSnapshot {
  const target = findPrevActiveIdx(steps, snap.idx, snap.answers)
  if (target === null) return snap
  return {
    ...snap,
    idx: target,
    mood: { kind: "back", line },
    hovered: undefined,
  }
}

export function setHover(
  snap: WizardSnapshot,
  hovered: unknown,
): WizardSnapshot {
  return { ...snap, hovered }
}

export function markDone(snap: WizardSnapshot): WizardSnapshot {
  return { ...snap, done: true }
}

// ─── Speech derivation ────────────────────────────────────────────────

export function wizardSpeech(
  snap: WizardSnapshot,
  current: Step,
  steps: Step[],
  intro: string,
): Speech {
  const recap = recapParts(steps, snap.idx, snap.answers).join(", ")

  const mood: Speech["mood"] =
    snap.mood.kind === "intro"
      ? { text: intro, tone: "neutral" }
      : snap.mood.kind === "back"
      ? { text: snap.mood.line, tone: "back" }
      : { text: snap.mood.line, tone: "neutral" }

  const hover = snap.hovered !== undefined
    ? current.hoverComment?.(snap.hovered as never)
    : undefined

  return {
    mood,
    recap: recap || undefined,
    ask: current.prompt,
    hover,
    hint: hover ? undefined : current.hint,
  }
}
