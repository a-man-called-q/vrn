import { useEffect, useState } from "react"
import { render, useApp } from "ink"

import { requireProjectRoot, readProjectConfig } from "../../utils/project.js"
import { generateApp } from "../../generators/index.js"
import { regenerateDocker } from "../../generators/docker/index.js"
import { resolveTemplatesDir } from "../../utils/paths.js"
import { Bubble, useExitOnPhase } from "../../ui/index.js"
import type { ProjectConfig } from "../../types.js"

import { appExists, syncVrn } from "./sync-vrn.js"
import { syncSpeech, type SyncItem } from "./phase-speech.js"

export { syncSpeech } from "./phase-speech.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

interface AppProps {
  projectRoot: string
  config: ProjectConfig
}

function SyncApp({ projectRoot, config }: AppProps) {
  const { exit } = useApp()
  const [items, setItems] = useState<SyncItem[]>(() => initialItems(projectRoot, config))
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    let cancelled = false

    async function work() {
      const existing = config.apps.filter(a => appExists(projectRoot, a))
      const missing = config.apps.filter(a => !appExists(projectRoot, a))

      for (const app of existing.filter(a => a.type === "service")) {
        if (cancelled) return
        const id = `vrn-${app.dirName}`
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: "running" } : i))
        try {
          syncVrn(projectRoot, TEMPLATES_DIR, app, config)
          setItems(prev => prev.map(i => i.id === id ? { ...i, status: "done" } : i))
        } catch (err) {
          setItems(prev => prev.map(i =>
            i.id === id ? { ...i, status: "failed", detail: (err as Error).message } : i
          ))
        }
      }

      for (const app of missing) {
        if (cancelled) return
        const id = `gen-${app.dirName}`
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: "running" } : i))
        try {
          generateApp(projectRoot, TEMPLATES_DIR, app, config)
          setItems(prev => prev.map(i => i.id === id ? { ...i, status: "done" } : i))
        } catch (err) {
          setItems(prev => prev.map(i =>
            i.id === id ? { ...i, status: "failed", detail: (err as Error).message } : i
          ))
        }
      }

      if (cancelled) return
      setItems(prev => prev.map(i => i.id === "docker" ? { ...i, status: "running" } : i))
      try {
        regenerateDocker(projectRoot, TEMPLATES_DIR, config)
        setItems(prev => prev.map(i => i.id === "docker" ? { ...i, status: "done" } : i))
      } catch (err) {
        setItems(prev => prev.map(i =>
          i.id === "docker" ? { ...i, status: "failed", detail: (err as Error).message } : i
        ))
      }

      if (!cancelled) setDone(true)
    }

    work()
    return () => { cancelled = true }
  }, [])

  useExitOnPhase(done, exit)

  return <Bubble active={!done} speech={syncSpeech(config.name, items, done)} />
}

function initialItems(projectRoot: string, config: ProjectConfig): SyncItem[] {
  const existing = config.apps.filter(a => appExists(projectRoot, a))
  const missing = config.apps.filter(a => !appExists(projectRoot, a))
  const list: SyncItem[] = []
  for (const app of existing.filter(a => a.type === "service")) {
    list.push({ id: `vrn-${app.dirName}`, label: `_vrn/ ${app.dirName}`, status: "pending" })
  }
  for (const app of existing.filter(a => a.type !== "service")) {
    list.push({
      id: `skip-${app.dirName}`,
      label: `${app.dirName}`,
      status: "skipped",
      detail: `no _vrn/ for ${app.type}`,
    })
  }
  for (const app of missing) {
    list.push({ id: `gen-${app.dirName}`, label: `${app.dirName}`, status: "pending" })
  }
  list.push({ id: "docker", label: "docker-compose.yml", status: "pending" })
  return list
}

export async function run(): Promise<void> {
  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)
  const { waitUntilExit } = render(<SyncApp projectRoot={projectRoot} config={config} />)
  await waitUntilExit()
}
