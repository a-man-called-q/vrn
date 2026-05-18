import * as p from "@clack/prompts"
import { requireProjectRoot, readProjectConfig, writeProjectConfig } from "../utils/project.js"
import { resolveTemplatesDir } from "../utils/paths.js"
import * as subscriptionAddon from "../addons/subscription.js"

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url)

const ADDONS = {
  subscription: subscriptionAddon,
} as const

type AddonName = keyof typeof ADDONS

export function run(): void {
  const addonArg = process.argv[3] as AddonName | undefined

  if (!addonArg) {
    console.log("Available addons:")
    for (const [name, addon] of Object.entries(ADDONS)) {
      console.log(`  ${name.padEnd(16)} ${addon.description}`)
    }
    process.exit(0)
  }

  if (!Object.hasOwn(ADDONS, addonArg)) {
    console.error(`Unknown addon: ${addonArg}`)
    console.error(`Available: ${Object.keys(ADDONS).join(", ")}`)
    process.exit(1)
  }
  const addon = ADDONS[addonArg]

  const projectRoot = requireProjectRoot()
  const config = readProjectConfig(projectRoot)

  if ((config.addons ?? []).includes(addonArg)) {
    p.log.warn(`${addonArg} is already installed.`)
    process.exit(0)
  }

  console.log()
  p.intro(`vrn add ${addonArg}`)

  const updatedConfig = { ...config, addons: [...(config.addons ?? []), addonArg] }

  const spinner = p.spinner()
  spinner.start(`Installing ${addonArg}...`)

  try {
    addon.install(projectRoot, TEMPLATES_DIR, updatedConfig)
    writeProjectConfig(projectRoot, updatedConfig)
    spinner.stop(`${addonArg} installed`)
  } catch (err) {
    spinner.stop(`Failed to install ${addonArg}`)
    console.error(err)
    process.exit(1)
  }

  p.outro("Done! Run `bunx vrn sync` to regenerate wiring files.")
}
