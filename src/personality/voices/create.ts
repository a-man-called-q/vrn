// Voice for the `create` command — greetings, wizard step copy, dynamic
// helpers, and the scaffold-action lines (writing/done/failed).

import type { StepVoice, ConfirmVoice } from "../types.js"

export const greetings = {
  withName: [
    (n: string) => `${n} — got it`,
    (n: string) => `${n}, nice. let's set it up`,
    (n: string) => `alright, ${n} it is`,
  ],
  withoutName: [
    "what are we building?",
    "fresh monorepo — let's go",
    "okay, name first",
  ],
}

// ─── wizard steps ──────────────────────────────────────────────────────

const nameStep: StepVoice = {
  ask: "what's the project called?",
  hint: "lowercase, kebab-case",
  recap: v => v,
}

const authStep: StepVoice<"zitadel" | "local"> = {
  ask: "how should people sign in?",
  hint: "you can switch later if you change your mind",
  reactions: {
    zitadel: "zitadel — full sso then",
    local: "local auth, keeping it simple",
  },
  hover: {
    zitadel: "zitadel handles sso, mfa, the works — good for b2b",
    local: "local users in your own db — fast to ship, easy to outgrow",
  },
  recap: v => v === "zitadel" ? "zitadel sso" : "local auth",
}

const tenantStep: StepVoice<"multi" | "single"> = {
  ask: "single tenant or multi?",
  hint: "multi = each customer isolated, single = one shared instance",
  reactions: {
    multi: "saas mode then",
    single: "single tenant, simpler ops",
  },
  hover: {
    multi: "multi-tenant — every customer gets their own scoped data",
    single: "single tenant — one app, one shared dataset",
  },
  recap: v => v === "multi" ? "multi-tenant" : "single-tenant",
}

const jsPmStep: StepVoice<"bun" | "pnpm" | "npm" | "yarn"> = {
  ask: "which js package manager?",
  hint: "you can swap this later too",
  reactions: {
    bun: "bun it is",
    pnpm: "pnpm — fine choice",
    npm: "npm, classic",
    yarn: "yarn, okay",
  },
  hover: {
    bun: "bun — fastest install i've seen, also runs the code",
    pnpm: "pnpm — content-addressed, light on disk",
    npm: "npm — boring but solid",
    yarn: "yarn — works fine, just slower than the others",
  },
}

const pythonStep: ConfirmVoice = {
  ask: "want python support too?",
  reactions: {
    yes: "python in the mix",
    no: "skipping python, leaner stack",
  },
  hover: {
    yes: "adds litestar option later when you generate services",
    no: "you can still add it later — just slimmer for now",
  },
}

const rustStep: ConfirmVoice = {
  ask: "include rust?",
  reactions: {
    yes: "rust along for the ride",
    no: "no rust this time",
  },
  hover: {
    yes: "you'll be able to drop in rust crates as services",
    no: "skip for now — easy to add back",
  },
}

const reviewStep: ConfirmVoice = {
  ask: "ready to scaffold?",
  hint: "this writes the project to disk",
  reactions: {
    yes: "alright, cooking",
    no: "no worries — we can pick this up later",
  },
  hover: {
    yes: "i'll write the files and init git",
    no: "nothing gets written — clean exit",
  },
}

export const steps = {
  name: nameStep,
  auth: authStep,
  tenant: tenantStep,
  jsPm: jsPmStep,
  python: pythonStep,
  rust: rustStep,
  review: reviewStep,
}

// dynamic bits that depend on runtime values — call-site composes the
// final string, voice file stays declarative.
export const dyn = {
  nameSkipAhead: (v: string) => `starting from "${v}", skipping the name step`,
  nameInvalidArg: (v: string) => `"${v}" won't work as a name — pick another`,
  pythonHint: (version: string) => `uv ${version} is installed`,
  rustHint: (tool: string, version: string) => `${tool} ${version} is installed`,
  jsPmRecap: (name: string, version?: string) => version ? `${name} ${version}` : name,
  pythonRecap: (yes: boolean, version?: string) =>
    yes ? (version ? `uv ${version}` : "python") : "no python",
  rustRecap: (yes: boolean, version?: string) =>
    yes ? (version ? `rust ${version}` : "rust") : "no rust",
}

// ─── scaffold-action lines (after the wizard commits) ──────────────────

export const scaffolding = {
  start: "writing the project files",
  done: (name: string) => `done — your project lives at ./${name}`,
  failed: "scaffold hit a snag",
  nextSteps: "ping me with /gen when you want to add a service or portal",
}

export const jsPmProbe = {
  timeout: (tool: string) => `${tool} probe took too long — shim slow?`,
  ok: (tool: string, version: string) => `${tool} ${version} — found it`,
  retryAsk: (tool: string) => `let me peek at ${tool} again — q to skip`,
  retryGiveUp: (tool: string) => `still no answer on ${tool} — version "unknown" for now`,
  retryCancel: (tool: string) => `okay, leaving ${tool} as "unknown"`,
  fallbackNpm: "no js pm found locally — falling back to npm",
}
