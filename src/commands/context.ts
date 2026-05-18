import { findProjectRoot, readProjectConfig } from "../utils/project.js"
import { buildProjectContext } from "../utils/context.js"

export function run(): void {
  const projectRoot = findProjectRoot()
  if (!projectRoot) {
    // Output to stdout so Claude can read and warn the developer
    console.log("⚠️  vrn.yaml not found in this directory or any parent directory.")
    console.log("This project may not be a VRN project, or vrn.yaml was accidentally deleted.")
    console.log("Run `bunx vrn doctor` to diagnose, or `bun create vrn <name>` to start a new project.")
    process.exit(0)
  }

  const config = readProjectConfig(projectRoot)
  console.log(buildProjectContext(projectRoot, config))
}
