import { useEffect, useState } from "react"
import { render, useApp } from "ink"
import { mkdirSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

import { generateBase } from "../generators/base.js"
import { writeProjectConfig } from "../utils/project.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import {
  fetchLatestMoonVersion,
  probeCandidates,
  probeOne,
  JS_CANDIDATES,
  PYTHON_CANDIDATES,
  RUST_CANDIDATES,
  NPM_FALLBACK_VERSION,
  type ProbeBreakdown,
} from "../utils/cli.js"
import {
  Bubble,
  Wizard,
  type Speech,
  type Step,
} from "../ui/index.js"
import {
  verney,
  greet,
  ack,
  reactionFor,
  hoverFor,
  recapFor,
} from "../personality/index.js"
import type {
  ProjectConfig,
  JsPackageManager,
  PythonPackageManager,
  RustPackageManager,
  PackageManagers,
} from "../types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

const NAME_RE = /^[a-z][a-z0-9-]*$/
function validateName(value: string): string | undefined {
  if (!value || value.trim() === "") return "name is required"
  if (!NAME_RE.test(value)) {
    return "lowercase letters, numbers, and hyphens only — must start with a letter"
  }
  if (value.length > 64) return "name must be 64 characters or less"
}

interface ProbeResult {
  js: ProbeBreakdown<JsPackageManager>
  python: ProbeBreakdown<PythonPackageManager>
  rust: ProbeBreakdown<RustPackageManager>
  moonVersion: string
}

type Phase =
  | { kind: "probe" }
  | { kind: "wizard"; probe: ProbeResult; steps: Step[] }
  | { kind: "resolving"; probe: ProbeResult; answers: Record<string, unknown>; tool: JsPackageManager }
  | { kind: "scaffold"; config: ProjectConfig; targetDir: string }
  | { kind: "done"; name: string }
  | { kind: "error"; message: string }
  | { kind: "cancelled" }

interface AppProps {
  nameArg?: string
  noGit: boolean
}

function App({ nameArg, noGit }: AppProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>({ kind: "probe" })

  // ── Phase: probe ────────────────────────────────────────────────
  useEffect(() => {
    if (phase.kind !== "probe") return
    let cancelled = false
    Promise.all([
      probeCandidates(JS_CANDIDATES),
      probeCandidates(PYTHON_CANDIDATES),
      probeCandidates(RUST_CANDIDATES),
      fetchLatestMoonVersion(),
    ]).then(([js, python, rust, moonVersion]) => {
      if (cancelled) return
      const probe: ProbeResult = { js, python, rust, moonVersion }
      const steps = buildSteps({ nameArg, probe })
      setPhase({ kind: "wizard", probe, steps })
    })
    return () => { cancelled = true }
  }, [phase.kind])

  // ── Phase: resolving (slow-probe retry for timed-out JS PM) ─────
  useEffect(() => {
    if (phase.kind !== "resolving") return
    let cancelled = false
    probeOne(phase.tool, { timeout: 6000 }).then(res => {
      if (cancelled) return
      const newProbe: ProbeResult = { ...phase.probe }
      if (res.kind === "found") {
        newProbe.js = {
          ...newProbe.js,
          found: [...newProbe.js.found, { name: phase.tool, version: res.version }],
          timedOut: newProbe.js.timedOut.filter(n => n !== phase.tool),
        }
      }
      proceedToScaffold(phase.answers, newProbe)
    })
    return () => { cancelled = true }
  }, [phase.kind])

  // ── Phase: scaffold ─────────────────────────────────────────────
  useEffect(() => {
    if (phase.kind !== "scaffold") return
    try {
      mkdirSync(phase.targetDir, { recursive: true })
      generateBase(phase.targetDir, TEMPLATES_DIR, phase.config)
      writeProjectConfig(phase.targetDir, phase.config)
      if (!noGit) {
        execSync("git init", { cwd: phase.targetDir, stdio: "pipe" })
      }
      setPhase({ kind: "done", name: phase.config.name })
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message })
    }
  }, [phase.kind])

  // ── Phase: done / cancelled / error → exit ──────────────────────
  useEffect(() => {
    if (phase.kind === "done" || phase.kind === "cancelled" || phase.kind === "error") {
      const t = setTimeout(() => exit(), 50)
      return () => clearTimeout(t)
    }
  }, [phase.kind, exit])

  function proceedToScaffold(answers: Record<string, unknown>, probe: ProbeResult) {
    const config = buildConfig(answers, probe)
    const targetDir = resolve(process.cwd(), config.name)
    if (existsSync(targetDir)) {
      setPhase({ kind: "error", message: `directory "${config.name}" already exists` })
      return
    }
    setPhase({ kind: "scaffold", config, targetDir })
  }

  // ── Render ──────────────────────────────────────────────────────
  if (phase.kind === "wizard") {
    return (
      <Wizard
        intro={nameArg ? `creating ${nameArg}` : "let's cook up a monorepo"}
        steps={phase.steps}
        onComplete={answers => {
          if (answers["review"] === false) {
            setPhase({ kind: "cancelled" })
            return
          }
          const jsPmName = answers["jsPm"] as JsPackageManager
          const wasTimedOut =
            phase.probe.js.timedOut.includes(jsPmName) &&
            !phase.probe.js.found.find(f => f.name === jsPmName)
          if (wasTimedOut) {
            setPhase({
              kind: "resolving",
              probe: phase.probe,
              answers,
              tool: jsPmName,
            })
            return
          }
          proceedToScaffold(answers, phase.probe)
        }}
        onCancel={() => setPhase({ kind: "cancelled" })}
      />
    )
  }
  return <Bubble active={isActivePhase(phase)} speech={phaseSpeech(phase)} />
}

// ─── Phase → Speech mapping ────────────────────────────────────────
// Pure function from a (non-wizard) Phase to the Speech verney delivers.
// Kept separate from rendering so it's trivially testable.

export function phaseSpeech(phase: Exclude<Phase, { kind: "wizard" }>): Speech {
  switch (phase.kind) {
    case "probe":
      return {
        ask: "let me see what you've got installed",
        status: "sniffing toolchain",
      }
    case "resolving":
      return {
        ask: verney.jsPmProbe.retryAsk(phase.tool),
        status: "giving it 6s this time",
      }
    case "scaffold":
      return {
        ask: verney.scaffolding.start,
        status: `writing ./${phase.config.name}`,
      }
    case "done":
      return {
        closing: verney.scaffolding.done(phase.name),
        details: [
          "",
          "next steps:",
          `  → cd ${phase.name}`,
          `  → bunx vrn gen service     # backend api`,
          `  → bunx vrn gen portal      # end-user frontend`,
          `  → bunx vrn gen backoffice  # admin dashboard`,
          "",
          verney.scaffolding.nextSteps,
        ],
      }
    case "error":
      return {
        error: verney.scaffolding.failed,
        details: [phase.message],
      }
    case "cancelled":
      return { ask: verney.events.cancelled }
  }
}

function isActivePhase(phase: Exclude<Phase, { kind: "wizard" }>): boolean {
  return phase.kind === "probe"
    || phase.kind === "resolving"
    || phase.kind === "scaffold"
    || phase.kind === "error"
}

// ─── Step builder ──────────────────────────────────────────────────

function buildSteps({
  nameArg,
  probe,
}: {
  nameArg?: string
  probe: ProbeResult
}): Step[] {
  const steps: Step[] = []
  const { name, auth, tenant, jsPm, python, rust, review } = verney.steps

  // 1. name
  const nameValid = nameArg && !validateName(nameArg) ? nameArg : undefined
  steps.push({
    kind: "text",
    id: "name",
    label: "name",
    prompt: name.ask,
    hint: name.hint,
    placeholder: "my-saas",
    validate: validateName,
    reaction: v => greet(v),
    display: v => v,
    recap: v => recapFor(name, v) ?? v,
    preset: nameValid
      ? { value: nameValid, message: verney.dyn.nameSkipAhead(nameValid) }
      : undefined,
  })

  // 2. auth
  steps.push({
    kind: "select",
    id: "auth",
    label: "auth",
    prompt: auth.ask,
    hint: auth.hint,
    options: [
      { value: "local", label: "local — quick start" },
      { value: "zitadel", label: "zitadel — sso / enterprise" },
    ],
    initialValue: "local",
    reaction: v => reactionFor(auth, v as "local" | "zitadel") ?? ack(),
    hoverComment: v => hoverFor(auth, v as "local" | "zitadel"),
    display: v => v,
    recap: v => recapFor(auth, v as "local" | "zitadel"),
  })

  // 3. tenant
  steps.push({
    kind: "select",
    id: "tenant",
    label: "tenant",
    prompt: tenant.ask,
    hint: tenant.hint,
    options: [
      { value: "single", label: "single tenant" },
      { value: "multi", label: "multi tenant (saas)" },
    ],
    initialValue: "single",
    reaction: v => reactionFor(tenant, v as "single" | "multi") ?? ack(),
    hoverComment: v => hoverFor(tenant, v as "single" | "multi"),
    display: v => v,
    recap: v => recapFor(tenant, v as "single" | "multi"),
  })

  // 4. js package manager
  const jsFound = probe.js.found
  const jsTimedOut = probe.js.timedOut
  const jsOptions = [
    ...jsFound.map(f => ({ value: f.name, label: `${f.name} ${f.version}` })),
    ...jsTimedOut.map(n => ({ value: n, label: `${n} ⚠ probe timed out` })),
  ]
  if (jsOptions.length === 0) {
    // Hard fallback to npm.
    steps.push({
      kind: "select",
      id: "jsPm",
      label: "js pm",
      prompt: jsPm.ask,
      hint: verney.jsPmProbe.fallbackNpm,
      options: [{ value: "npm", label: `npm ${NPM_FALLBACK_VERSION} (fallback)` }],
      reaction: () => verney.jsPmProbe.fallbackNpm,
      display: () => `npm ${NPM_FALLBACK_VERSION}`,
      preset: { value: "npm", message: verney.jsPmProbe.fallbackNpm },
    })
  } else if (jsOptions.length === 1 && jsFound.length === 1) {
    // Single found — skip with ack.
    const only = jsFound[0]!
    steps.push({
      kind: "select",
      id: "jsPm",
      label: "js pm",
      prompt: jsPm.ask,
      options: jsOptions,
      reaction: () => verney.jsPmProbe.ok(only.name, only.version),
      display: () => `${only.name} ${only.version}`,
      preset: {
        value: only.name,
        message: verney.jsPmProbe.ok(only.name, only.version),
      },
    })
  } else {
    const preferred = jsFound.find(f => f.name === "bun")?.name ?? jsFound[0]?.name ?? jsTimedOut[0]
    steps.push({
      kind: "select",
      id: "jsPm",
      label: "js pm",
      prompt: jsPm.ask,
      hint: jsPm.hint,
      options: jsOptions,
      initialValue: preferred,
      reaction: v => {
        const hit = jsFound.find(f => f.name === v)
        if (hit) return verney.jsPmProbe.ok(hit.name, hit.version)
        return reactionFor(jsPm, v as "bun" | "pnpm" | "npm" | "yarn") ?? ack()
      },
      hoverComment: v => hoverFor(jsPm, v as "bun" | "pnpm" | "npm" | "yarn"),
      display: v => {
        const hit = jsFound.find(f => f.name === v)
        return hit ? `${hit.name} ${hit.version}` : `${v} ⚠`
      },
      recap: v => {
        const hit = jsFound.find(f => f.name === v)
        return verney.dyn.jsPmRecap(v, hit?.version)
      },
    })
  }

  // 5. python (only if detected on this machine)
  if (probe.python.found.length > 0) {
    const py = probe.python.found[0]!
    steps.push({
      kind: "confirm",
      id: "python",
      label: "python",
      prompt: python.ask,
      hint: verney.dyn.pythonHint(py.version),
      yesLabel: `yes — use ${py.name} ${py.version}`,
      noLabel: "no, skip python",
      initialValue: false,
      reaction: v => reactionFor(python, v ? "yes" : "no") ?? ack(),
      hoverComment: v => hoverFor(python, v ? "yes" : "no"),
      display: v => v ? `${py.name} ${py.version}` : "skipped",
      recap: v => verney.dyn.pythonRecap(v, py.version),
    })
  }

  // 6. rust (only if detected on this machine)
  if (probe.rust.found.length > 0) {
    const rs = probe.rust.found[0]!
    steps.push({
      kind: "confirm",
      id: "rust",
      label: "rust",
      prompt: rust.ask,
      hint: verney.dyn.rustHint(rs.name, rs.version),
      yesLabel: `yes — use ${rs.name}`,
      noLabel: "no, skip rust",
      initialValue: false,
      reaction: v => reactionFor(rust, v ? "yes" : "no") ?? ack(),
      hoverComment: v => hoverFor(rust, v ? "yes" : "no"),
      display: v => v ? `${rs.name} ${rs.version}` : "skipped",
      recap: v => verney.dyn.rustRecap(v, rs.version),
    })
  }

  // 7. review
  steps.push({
    kind: "confirm",
    id: "review",
    label: "review",
    prompt: review.ask,
    hint: review.hint,
    yesLabel: "yes, scaffold it",
    noLabel: "no, hold off",
    initialValue: true,
    reaction: v => reactionFor(review, v ? "yes" : "no") ?? ack(),
    hoverComment: v => hoverFor(review, v ? "yes" : "no"),
    display: v => v ? "proceed" : "cancel",
  })

  return steps
}

function buildConfig(
  answers: Record<string, unknown>,
  probe: ProbeResult,
): ProjectConfig {
  const name = answers["name"] as string
  const auth = answers["auth"] as "local" | "zitadel"
  const tenant = answers["tenant"] as "single" | "multi"
  const jsPmName = answers["jsPm"] as JsPackageManager

  const jsHit = probe.js.found.find(f => f.name === jsPmName)
  const jsPm = jsHit ?? { name: jsPmName, version: jsPmName === "npm" ? NPM_FALLBACK_VERSION : "unknown" }

  const packageManagers: PackageManagers = { js: jsPm }
  if (answers["python"]) {
    const py = probe.python.found[0]
    if (py) packageManagers.python = py
  }
  if (answers["rust"]) {
    const rs = probe.rust.found[0]
    if (rs) packageManagers.rust = rs
  }

  return {
    name,
    packageManagers,
    moonVersion: probe.moonVersion,
    useZitadel: auth === "zitadel",
    multiTenant: tenant === "multi",
    addons: [],
    apps: [],
  }
}

// ─── Entry ─────────────────────────────────────────────────────────

export async function run(): Promise<void> {
  const nameArg = process.argv.slice(2).find(a => !a.startsWith("-") && a !== "create")
  const noGit = process.argv.includes("--no-git")
  const { waitUntilExit } = render(<App nameArg={nameArg} noGit={noGit} />)
  await waitUntilExit()
}
