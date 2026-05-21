import { useEffect, useState } from "react"
import { render, useApp } from "ink"
import { mkdirSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

import { generateBase } from "../../generators/base.js"
import { writeProjectConfig } from "../../utils/project.js"
import { resolveTemplatesDir } from "../../utils/paths.js"
import {
  fetchLatestMoonVersion,
  probeCandidates,
  probeOne,
  JS_CANDIDATES,
  PYTHON_CANDIDATES,
  RUST_CANDIDATES,
} from "../../utils/probe.js"
import { Bubble, Wizard, useExitOnPhase } from "../../ui/index.js"
import type { JsPackageManager } from "../../types.js"

import { buildConfig, type ProbeResult } from "./config.js"
import { buildSteps } from "./steps.js"
import { phaseSpeech, isActivePhase } from "./phase-speech.js"
import type { Phase } from "./types.js"

export { phaseSpeech } from "./phase-speech.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

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

  useExitOnPhase(
    phase.kind === "done" || phase.kind === "cancelled" || phase.kind === "error",
    exit,
  )

  function proceedToScaffold(answers: Record<string, unknown>, probe: ProbeResult) {
    const config = buildConfig(answers, probe)
    const targetDir = resolve(process.cwd(), config.name)
    if (existsSync(targetDir)) {
      setPhase({ kind: "error", message: `directory "${config.name}" already exists` })
      return
    }
    setPhase({ kind: "scaffold", config, targetDir })
  }

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

export async function run(): Promise<void> {
  const nameArg = process.argv.slice(2).find(a => !a.startsWith("-") && a !== "create")
  const noGit = process.argv.includes("--no-git")
  const { waitUntilExit } = render(<App nameArg={nameArg} noGit={noGit} />)
  await waitUntilExit()
}
