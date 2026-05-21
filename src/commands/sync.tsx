import { useEffect, useState } from "react"
import { render, useApp } from "ink"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { requireProjectRoot, readProjectConfig } from "../utils/project.js"
import { buildTemplateData } from "../utils/template-data.js"
import { generateApp } from "../generators/index.js"
import { regenerateDocker } from "../generators/docker.js"
import { copyTemplateDir } from "../utils/template.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import { Bubble, type RowStatus, type Speech, type SpeechRow } from "../ui/index.js"
import { verney } from "../personality/index.js"
import type { AppEntry, ProjectConfig } from "../types.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

type ItemStatus = "pending" | "running" | "done" | "skipped" | "failed"

interface SyncItem {
  id: string
  label: string
  status: ItemStatus
  detail?: string
}

const STATUS_TO_ROW: Record<ItemStatus, RowStatus> = {
  pending: "pending",
  running: "active",
  done: "done",
  skipped: "skipped",
  failed: "failed",
}

function appExists(projectRoot: string, app: AppEntry): boolean {
  return existsSync(join(projectRoot, "apps", app.dirName))
}

function syncVrn(projectRoot: string, app: AppEntry, config: ProjectConfig): void {
  if (app.type !== "service") return
  const data = buildTemplateData(app, config)
  const templateBase = app.serviceFramework === "litestar"
    ? "apps/api-python/src/_vrn"
    : "apps/api/src/_vrn"
  copyTemplateDir(
    join(TEMPLATES_DIR, templateBase),
    join(projectRoot, "apps", app.dirName, "src", "_vrn"),
    data
  )
}

interface AppProps {
  projectRoot: string
  config: ProjectConfig
}

function SyncApp({ projectRoot, config }: AppProps) {
  const { exit } = useApp()
  const [items, setItems] = useState<SyncItem[]>(() => {
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
  })
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
          syncVrn(projectRoot, app, config)
          setItems(prev => prev.map(i => i.id === id ? { ...i, status: "done" } : i))
        } catch (err) {
          setItems(prev => prev.map(i => i.id === id ? { ...i, status: "failed", detail: (err as Error).message } : i))
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
          setItems(prev => prev.map(i => i.id === id ? { ...i, status: "failed", detail: (err as Error).message } : i))
        }
      }

      if (cancelled) return
      setItems(prev => prev.map(i => i.id === "docker" ? { ...i, status: "running" } : i))
      try {
        regenerateDocker(projectRoot, TEMPLATES_DIR, config)
        setItems(prev => prev.map(i => i.id === "docker" ? { ...i, status: "done" } : i))
      } catch (err) {
        setItems(prev => prev.map(i => i.id === "docker" ? { ...i, status: "failed", detail: (err as Error).message } : i))
      }

      if (!cancelled) setDone(true)
    }

    work()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => exit(), 50)
      return () => clearTimeout(t)
    }
  }, [done, exit])

  return <Bubble active={!done} speech={syncSpeech(config.name, items, done)} />
}

export function syncSpeech(projectName: string, items: SyncItem[], done: boolean): Speech {
  const synced = items.filter(i => i.id.startsWith("vrn-") && i.status === "done").length
  const generated = items.filter(i => i.id.startsWith("gen-") && i.status === "done").length
  const summary = done
    ? (synced + generated === 0 ? verney.sync.alreadyInSync : verney.sync.summary(synced, generated))
    : undefined

  const rows: SpeechRow[] = items.map(item => ({
    text: item.label,
    status: STATUS_TO_ROW[item.status],
    detail: item.detail,
  }))

  const speech: Speech = {
    ask: verney.sync.intro(projectName),
    rows,
  }
  if (summary) speech.closing = summary
  return speech
}

export async function run(): Promise<void> {
  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)
  const { waitUntilExit } = render(<SyncApp projectRoot={projectRoot} config={config} />)
  await waitUntilExit()
}
