// Voice for the `gen` command — its own wizard + menu copy.

import type { StepVoice, ConfirmVoice } from "../types.js"

const pickType: StepVoice<"service" | "portal" | "backoffice" | "done"> = {
  ask: "what are we adding?",
  hint: "we'll keep going until you say done",
  reactions: {
    service: "service it is",
    portal: "portal — user-facing",
    backoffice: "backoffice — admin side",
    done: "alright, wrapping up",
  },
  hover: {
    service: "a backend api — picks framework next",
    portal: "an end-user web app",
    backoffice: "an admin dashboard",
    done: "no more apps, finish up",
  },
}

const framework: StepVoice<"elysia" | "litestar"> = {
  ask: "which framework?",
  hint: "elysia runs on bun, litestar runs on python",
  reactions: {
    elysia: "elysia — bun-native, very quick",
    litestar: "litestar — python it is",
  },
  hover: {
    elysia: "elysia — typescript, runs on bun, great dx",
    litestar: "litestar — python, async, type-hinted",
  },
}

const port: StepVoice = {
  ask: "which port should it listen on?",
  hint: "default works if nothing else is using it",
}

const links: StepVoice = {
  ask: "which services should it talk to?",
  hint: "space to toggle, enter to confirm — pick zero or more",
}

const goAgain: ConfirmVoice = {
  ask: "add another?",
  reactions: {
    yes: "okay, round two",
    no: "done — installing deps next",
  },
  hover: {
    yes: "keep adding apps",
    no: "stop here and install deps",
  },
}

export const gen = {
  intro: (project: string) => `working on ${project}`,
  pickType,
  framework,
  port,
  links,
  goAgain,
  appName: {
    ask: "what should it be called?",
    hintExamples: {
      service: "e.g. user → user-service",
      portal: "e.g. customer → portal-customer",
      backoffice: "e.g. ops → backoffice-ops",
    },
    placeholder: {
      service: "user",
      portal: "customer",
      backoffice: "ops",
    },
  },
  generating: (type: string) => `building the ${type}`,
  added: (dirName: string) => `apps/${dirName} added`,
  failed: (type: string) => `couldn't generate ${type}`,
  installing: "installing deps",
  installDone: "deps installed",
  installFailed: (pm: string) => `install failed — try '${pm} install' yourself`,
  done: "all set — your dev server should boot",
}
