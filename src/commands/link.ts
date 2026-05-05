import * as p from "@clack/prompts"
import { findProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"

export async function run(): Promise<void> {
  const source = process.argv[3]
  const target = process.argv[4]

  const projectRoot = findProjectRoot()
  if (!projectRoot) {
    console.error("Not inside a VRN project. Run `bun create vrn <name>` to create one.")
    process.exit(1)
  }

  if (!source || !target) {
    console.error("Usage: bunx vrn link <source-service> <target-service>")
    process.exit(1)
  }

  const config = readProjectConfig(projectRoot)

  console.log()
  p.intro(`vrn link — Connect ${source} → ${target}`)

  const sourceApp = config.apps.find(a => a.name === source && a.type === "service")
  const targetApp = config.apps.find(a => a.name === target && a.type === "service")

  if (!sourceApp) {
    p.cancel(`Service "${source}" not found in .vrn.yaml`)
    process.exit(1)
  }
  if (!targetApp) {
    p.cancel(`Service "${target}" not found in .vrn.yaml`)
    process.exit(1)
  }

  if (source === target) {
    p.cancel("A service cannot link to itself.")
    process.exit(1)
  }

  if (sourceApp.links?.includes(target)) {
    p.log.warn(`${source} already links to ${target}`)
    process.exit(0)
  }

  sourceApp.links = [...(sourceApp.links ?? []), target]
  writeProjectConfig(projectRoot, config)

  p.log.success(`Linked ${source}-service → ${target}-service-client`)
  p.log.info(`Add "${target}-service-client" to ${source}-service's dependencies manually.`)
  p.outro("Done!")
}
