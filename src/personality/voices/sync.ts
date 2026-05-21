// Voice for the `sync` command.

export const sync = {
  intro: (project: string) => `syncing ${project}`,
  syncingVrn: (dir: string) => `refreshing _vrn/ in ${dir}`,
  syncedVrn: (dir: string) => `_vrn/ in ${dir} is current`,
  failedVrn: (dir: string) => `couldn't refresh _vrn/ in ${dir}`,
  skipNonService: (dir: string, type: string) => `skipping ${dir} — no _vrn/ for ${type}`,
  generating: (dir: string) => `building ${dir}`,
  generated: (dir: string) => `${dir} built`,
  failedGen: (dir: string) => `${dir} failed to build`,
  regenDocker: "regenerating docker-compose.yml",
  regenDockerDone: "docker-compose.yml is current",
  regenDockerFailed: "couldn't regenerate docker-compose.yml",
  alreadyInSync: "nothing to do — everything's current",
  summary: (synced: number, gen: number) => {
    const parts: string[] = []
    if (synced > 0) parts.push(`${synced} _vrn/ refreshed`)
    if (gen > 0) parts.push(`${gen} app(s) built`)
    return `done — ${parts.join(", ")}`
  },
}
