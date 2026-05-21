import { SKILLS } from "./content.js"

export { SKILLS } from "./content.js"

export function run(): void {
  const skillName = process.argv[3]

  if (!skillName) {
    console.log("Available skills:")
    for (const name of Object.keys(SKILLS)) console.log(`  ${name}`)
    process.exit(0)
  }

  if (!Object.hasOwn(SKILLS, skillName)) {
    console.error(`Unknown skill: ${skillName}`)
    console.error(`Available: ${Object.keys(SKILLS).join(", ")}`)
    process.exit(1)
  }

  console.log(SKILLS[skillName])
}
