// Voice for the `add` command (addons).

export const add = {
  intro: (addon: string) => `adding ${addon}`,
  alreadyInstalled: (addon: string) => `${addon} is already in`,
  unknown: (addon: string, avail: string) => `i don't know "${addon}". available: ${avail}`,
  listHeader: "available addons:",
  installing: (addon: string) => `installing ${addon}`,
  installed: (addon: string) => `${addon} installed`,
  failed: (addon: string) => `couldn't install ${addon}`,
  nextSteps: "run `vrn sync` to refresh the wiring files",
}
