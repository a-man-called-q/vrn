// Voice for the `link` command.

export const link = {
  intro: (src: string, tgt: string) => `wiring ${src} → ${tgt}`,
  success: (src: string, tgt: string) => `${src} is now wired to ${tgt}-service-client`,
  selfLink: "an app can't link to itself",
  alreadyLinked: (src: string, tgt: string) => `${src} already talks to ${tgt} — nothing to do`,
  sourceNotFound: (name: string) => `i don't see "${name}" in vrn.yaml`,
  targetNotFound: (name: string) => `i don't see service "${name}" in vrn.yaml`,
  addedDep: (pkg: string, path: string) => `added ${pkg} to ${path}`,
  installing: "installing deps",
  done: "linked",
  usage: "usage: vrn link <source-app> <target-service>",
}
