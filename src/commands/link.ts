import * as p from "@clack/prompts"
import { requireProjectRoot, readProjectConfig } from "../utils/project.js"
import { runInstall } from "../utils/cli.js"
import { linkServices } from "../actions/link.js"

export async function run(): Promise<void> {
  const source = process.argv[3]
  const target = process.argv[4]

  const projectRoot = requireProjectRoot()

  if (!source || !target) {
    console.error("Usage: bunx vrn link <source-service> <target-service>")
    process.exit(1)
  }

  const config = readProjectConfig(projectRoot)

  console.log()
  p.intro(`vrn link — Connect ${source} → ${target}`)

  const result = linkServices(projectRoot, config, source, target)

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      "self-link": "A service cannot link to itself.",
      "already-linked": `${source} already links to ${target}`,
      "source-not-found": `Service "${source}" not found in vrn.yaml`,
      "target-not-found": `Service "${target}" not found in vrn.yaml`,
    }
    if (result.reason === "already-linked") {
      p.log.warn(messages[result.reason])
    } else {
      p.cancel(messages[result.reason])
    }
    process.exit(result.reason === "already-linked" ? 0 : 1)
  }

  if (result.addedDep) {
    p.log.info(`Added ${result.clientPkg} to ${result.servicePkgPath}`)
    runInstall(projectRoot, config.packageManager)
  }

  p.log.success(`Linked ${source}-service → ${target}-service-client`)
  p.outro("Done!")
}
