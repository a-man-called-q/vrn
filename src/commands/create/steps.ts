// Wizard step list for the create-command. Each step is built via the
// step-from-voice helpers so the voice file (personality/voices/create.ts)
// stays the single source of truth for copy.

import {
  selectStepFromVoice,
  confirmStepFromVoice,
  textStepFromVoice,
  type Step,
} from "../../ui/index.js"
import {
  verney,
  ack,
  greet,
  reactionFor,
  recapFor,
} from "../../personality/index.js"
import { NPM_FALLBACK_VERSION } from "../../utils/probe.js"

import { validateName, type ProbeResult } from "./config.js"

interface BuildStepsArgs {
  nameArg?: string
  probe: ProbeResult
}

export function buildSteps({ nameArg, probe }: BuildStepsArgs): Step[] {
  const { name, auth, tenant, jsPm, python, rust, review } = verney.steps

  const nameValid = nameArg && !validateName(nameArg) ? nameArg : undefined

  return [
    textStepFromVoice(name, {
      id: "name",
      placeholder: "my-saas",
      validate: validateName,
      reaction: v => greet(v),
      recap: v => recapFor(name, v) ?? v,
      preset: nameValid
        ? { value: nameValid, message: verney.dyn.nameSkipAhead(nameValid) }
        : undefined,
    }),
    selectStepFromVoice(auth, {
      id: "auth",
      options: [
        { value: "local", label: "local — quick start" },
        { value: "zitadel", label: "zitadel — sso / enterprise" },
      ],
      initialValue: "local",
    }),
    selectStepFromVoice(tenant, {
      id: "tenant",
      options: [
        { value: "single", label: "single tenant" },
        { value: "multi", label: "multi tenant (saas)" },
      ],
      initialValue: "single",
    }),
    jsPmStep(probe),
    ...pythonStep(probe),
    ...rustStep(probe),
    confirmStepFromVoice(review, {
      id: "review",
      yesLabel: "yes, scaffold it",
      noLabel: "no, hold off",
      initialValue: true,
      display: v => (v ? "proceed" : "cancel"),
    }),
  ]
}

function jsPmStep(probe: ProbeResult): Step {
  const { jsPm } = verney.steps
  const jsFound = probe.js.found
  const jsTimedOut = probe.js.timedOut
  const jsOptions = [
    ...jsFound.map(f => ({ value: f.name, label: `${f.name} ${f.version}` })),
    ...jsTimedOut.map(n => ({ value: n, label: `${n} ⚠ probe timed out` })),
  ]

  if (jsOptions.length === 0) {
    // No JS PM detected — hard fallback to npm.
    return selectStepFromVoice(jsPm, {
      id: "jsPm",
      label: "js pm",
      options: [{ value: "npm", label: `npm ${NPM_FALLBACK_VERSION} (fallback)` }],
      hint: verney.jsPmProbe.fallbackNpm,
      reaction: () => verney.jsPmProbe.fallbackNpm,
      display: () => `npm ${NPM_FALLBACK_VERSION}`,
      preset: { value: "npm", message: verney.jsPmProbe.fallbackNpm },
    })
  }

  if (jsOptions.length === 1 && jsFound.length === 1) {
    // Exactly one PM found — auto-pick with a friendly ack.
    const only = jsFound[0]!
    return selectStepFromVoice(jsPm, {
      id: "jsPm",
      label: "js pm",
      options: jsOptions,
      reaction: () => verney.jsPmProbe.ok(only.name, only.version),
      display: () => `${only.name} ${only.version}`,
      preset: {
        value: only.name,
        message: verney.jsPmProbe.ok(only.name, only.version),
      },
    })
  }

  // Multiple PMs available (or some timed out) — let the user pick.
  const preferred =
    jsFound.find(f => f.name === "bun")?.name ?? jsFound[0]?.name ?? jsTimedOut[0]

  return selectStepFromVoice(jsPm, {
    id: "jsPm",
    label: "js pm",
    options: jsOptions,
    initialValue: preferred,
    reaction: v => {
      const hit = jsFound.find(f => f.name === v)
      if (hit) return verney.jsPmProbe.ok(hit.name, hit.version)
      return reactionFor(jsPm, v) ?? ack()
    },
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

function pythonStep(probe: ProbeResult): Step[] {
  if (probe.python.found.length === 0) return []
  const py = probe.python.found[0]!
  return [
    confirmStepFromVoice(verney.steps.python, {
      id: "python",
      hint: verney.dyn.pythonHint(py.version),
      yesLabel: `yes — use ${py.name} ${py.version}`,
      noLabel: "no, skip python",
      initialValue: false,
      display: v => (v ? `${py.name} ${py.version}` : "skipped"),
      recap: v => verney.dyn.pythonRecap(v, py.version),
    }),
  ]
}

function rustStep(probe: ProbeResult): Step[] {
  if (probe.rust.found.length === 0) return []
  const rs = probe.rust.found[0]!
  return [
    confirmStepFromVoice(verney.steps.rust, {
      id: "rust",
      hint: verney.dyn.rustHint(rs.name, rs.version),
      yesLabel: `yes — use ${rs.name}`,
      noLabel: "no, skip rust",
      initialValue: false,
      display: v => (v ? `${rs.name} ${rs.version}` : "skipped"),
      recap: v => verney.dyn.rustRecap(v, rs.version),
    }),
  ]
}
