// Shared shape for any "thing verney offers to pick from" — a wizard step
// or a menu. Lets us look up reactions/hover/recap consistently across the
// codebase via the helpers in ./index.ts.

export interface StepVoice<K extends string = string> {
  // primary line verney says (the question/prompt).
  ask: string
  // static fallback hint shown when nothing is hovered.
  hint?: string
  // verney's short reaction once the user commits this value.
  reactions?: Partial<Record<K, string>>
  // live commentary while the user is hovering this value.
  hover?: Partial<Record<K, string>>
  // tiny phrase used in the waiter-style running recap.
  recap?: (value: K, ...extras: unknown[]) => string
}

// Convenience aliases for steps whose values are booleans (yes/no confirms).
export type ConfirmKey = "yes" | "no"
export type ConfirmVoice = StepVoice<ConfirmKey>
