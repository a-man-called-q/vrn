// verney's voice — content edited here, not in UI code.
// lines are written like a senior dev pair-programming with you, not a
// quest-giver. natural english, low template energy.

import type { StepVoice, ConfirmVoice } from "./voice.js"

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

// ─── steps used by the `create` wizard ─────────────────────────────────

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

// ─── per-command voice ─────────────────────────────────────────────────

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

// ─── gen command (its own wizard + menu) ───────────────────────────────

const genPickType: StepVoice<"service" | "portal" | "backoffice" | "done"> = {
  ask: "what are we adding?",
  hint: "we'll keep going until you say done",
  reactions: {
    service: "service it is",
    portal: "portal — user-facing",
    backoffice: "backoffice — admin side",
    done: "alright, wrapping up",
  },
  hover: {
    service: "a backend api — picks framework next",
    portal: "an end-user web app",
    backoffice: "an admin dashboard",
    done: "no more apps, finish up",
  },
}

const genFramework: StepVoice<"elysia" | "litestar"> = {
  ask: "which framework?",
  hint: "elysia runs on bun, litestar runs on python",
  reactions: {
    elysia: "elysia — bun-native, very quick",
    litestar: "litestar — python it is",
  },
  hover: {
    elysia: "elysia — typescript, runs on bun, great dx",
    litestar: "litestar — python, async, type-hinted",
  },
}

const genPort: StepVoice = {
  ask: "which port should it listen on?",
  hint: "default works if nothing else is using it",
}

const genLinks: StepVoice = {
  ask: "which services should it talk to?",
  hint: "space to toggle, enter to confirm — pick zero or more",
}

const genGoAgain: ConfirmVoice = {
  ask: "add another?",
  reactions: {
    yes: "okay, round two",
    no: "done — installing deps next",
  },
  hover: {
    yes: "keep adding apps",
    no: "stop here and install deps",
  },
}

export const gen = {
  intro: (project: string) => `working on ${project}`,
  pickType: genPickType,
  framework: genFramework,
  port: genPort,
  links: genLinks,
  goAgain: genGoAgain,
  appName: {
    ask: "what should it be called?",
    hintExamples: {
      service: "e.g. user → user-service",
      portal: "e.g. customer → portal-customer",
      backoffice: "e.g. ops → backoffice-ops",
    },
    placeholder: {
      service: "user",
      portal: "customer",
      backoffice: "ops",
    },
  },
  generating: (type: string) => `building the ${type}`,
  added: (dirName: string) => `apps/${dirName} added`,
  failed: (type: string) => `couldn't generate ${type}`,
  installing: "installing deps",
  installDone: "deps installed",
  installFailed: (pm: string) => `install failed — try '${pm} install' yourself`,
  done: "all set — your dev server should boot",
}

export const link = {
  intro: (src: string, tgt: string) => `wiring ${src} → ${tgt}`,
  success: (src: string, tgt: string) => `${src} is now wired to ${tgt}-service-client`,
  selfLink: "an app can't link to itself",
  alreadyLinked: (src: string, tgt: string) => `${src} already talks to ${tgt} — nothing to do`,
  sourceNotFound: (name: string) => `i don't see "${name}" in vrn.yaml`,
  targetNotFound: (name: string) => `i don't see service "${name}" in vrn.yaml`,
  addedDep: (pkg: string, path: string) => `added ${pkg} to ${path}`,
  installing: "installing deps",
  done: "linked",
  usage: "usage: vrn link <source-app> <target-service>",
}

export const sync = {
  intro: (project: string) => `syncing ${project}`,
  syncingVrn: (dir: string) => `refreshing _vrn/ in ${dir}`,
  syncedVrn: (dir: string) => `_vrn/ in ${dir} is current`,
  failedVrn: (dir: string) => `couldn't refresh _vrn/ in ${dir}`,
  skipNonService: (dir: string, type: string) => `skipping ${dir} — no _vrn/ for ${type}`,
  generating: (dir: string) => `building ${dir}`,
  generated: (dir: string) => `${dir} built`,
  failedGen: (dir: string) => `${dir} failed to build`,
  regenDocker: "regenerating docker-compose.yml",
  regenDockerDone: "docker-compose.yml is current",
  regenDockerFailed: "couldn't regenerate docker-compose.yml",
  alreadyInSync: "nothing to do — everything's current",
  summary: (synced: number, gen: number) => {
    const parts: string[] = []
    if (synced > 0) parts.push(`${synced} _vrn/ refreshed`)
    if (gen > 0) parts.push(`${gen} app(s) built`)
    return `done — ${parts.join(", ")}`
  },
}

export const add = {
  intro: (addon: string) => `adding ${addon}`,
  alreadyInstalled: (addon: string) => `${addon} is already in`,
  unknown: (addon: string, avail: string) => `i don't know "${addon}". available: ${avail}`,
  listHeader: "available addons:",
  installing: (addon: string) => `installing ${addon}`,
  installed: (addon: string) => `${addon} installed`,
  failed: (addon: string) => `couldn't install ${addon}`,
  nextSteps: "run `vrn sync` to refresh the wiring files",
}

export const doctor = {
  intro: "system check",
  checking: "checking tools",
  done: "all checks done",
  sectionRequired: "required",
  sectionOptional: "optional",
  sectionPackageManagers: "package managers",
  ready: "all required tools are here — you're good",
  missing: (tools: string) => `missing: ${tools}`,
  hint: {
    moonProto: "moon & proto   curl -fsSL https://moonrepo.dev/install/moon.sh | bash",
    bun: "bun            curl -fsSL https://bun.sh/install | bash",
    node: "node.js        https://nodejs.org",
  },
}

// ─── shared event lines ────────────────────────────────────────────────

export const events = {
  ack: [
    "got it",
    "noted",
    "alright",
    "okay",
    "sounds good",
  ],
  back: [
    "okay, what would you like to change?",
    "sure, back to that one",
    "alright, let's revisit",
    "no problem, pick again",
  ],
  cancelled: "all good — nothing was written. see you when you're ready",
  revisit: (step: string) => `back to ${step} — sure`,
}
