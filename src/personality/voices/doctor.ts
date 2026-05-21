// Voice for the `doctor` command.

export const doctor = {
  intro: "system check",
  checking: "checking tools",
  done: "all checks done",
  sectionRequired: "required",
  sectionOptional: "optional",
  sectionPackageManagers: "package managers",
  ready: "all required tools are here — you're good",
  missing: (tools: string) => `missing: ${tools}`,
  hint: {
    moonProto: "moon & proto   curl -fsSL https://moonrepo.dev/install/moon.sh | bash",
    bun: "bun            curl -fsSL https://bun.sh/install | bash",
    node: "node.js        https://nodejs.org",
  },
}
