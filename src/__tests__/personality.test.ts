import { describe, expect, test } from "bun:test"
import {
  verney,
  ack,
  backReact,
  greet,
  reactionFor,
  hoverFor,
  recapFor,
} from "../personality/index.js"

describe("verney content shape", () => {
  test("every step has an ask", () => {
    for (const step of Object.values(verney.steps)) {
      expect(typeof step.ask).toBe("string")
      expect(step.ask.length).toBeGreaterThan(0)
    }
  })

  test("step reactions cover the documented keys", () => {
    expect(verney.steps.auth.reactions?.zitadel).toBeDefined()
    expect(verney.steps.auth.reactions?.local).toBeDefined()
    expect(verney.steps.python.reactions?.yes).toBeDefined()
    expect(verney.steps.python.reactions?.no).toBeDefined()
  })

  test("step hover lines cover the same keys as reactions", () => {
    for (const step of Object.values(verney.steps)) {
      if (!step.reactions || !step.hover) continue
      for (const key of Object.keys(step.reactions)) {
        expect(step.hover[key as keyof typeof step.hover]).toBeDefined()
      }
    }
  })
})

describe("reactionFor / hoverFor / recapFor", () => {
  test("reactionFor returns the matched reaction", () => {
    expect(reactionFor(verney.steps.auth, "zitadel")).toBe("zitadel — full sso then")
    expect(reactionFor(verney.steps.auth, "local")).toBe("local auth, keeping it simple")
  })

  test("reactionFor returns undefined for unknown values", () => {
    expect(reactionFor(verney.steps.auth, "unknown" as never)).toBeUndefined()
  })

  test("hoverFor returns the matched commentary", () => {
    expect(hoverFor(verney.steps.tenant, "multi")).toContain("multi-tenant")
    expect(hoverFor(verney.steps.tenant, "single")).toContain("single tenant")
  })

  test("recapFor returns a short phrase", () => {
    expect(recapFor(verney.steps.name, "siketaps")).toBe("siketaps")
    expect(recapFor(verney.steps.auth, "zitadel")).toBe("zitadel sso")
    expect(recapFor(verney.steps.tenant, "multi")).toBe("multi-tenant")
  })

  test("recapFor returns undefined when no recap is defined", () => {
    // jsPm step intentionally has no recap (recap is computed by caller with version).
    expect(recapFor(verney.steps.jsPm, "bun")).toBeUndefined()
  })
})

describe("event helpers", () => {
  test("ack returns one of the documented lines", () => {
    const result = ack()
    expect(verney.events.ack as readonly string[]).toContain(result)
  })

  test("backReact returns one of the documented back lines", () => {
    const result = backReact()
    expect(verney.events.back as readonly string[]).toContain(result)
  })

  test("greet without a name returns one of the without-name lines", () => {
    const result = greet()
    expect(verney.greetings.withoutName as readonly string[]).toContain(result)
  })

  test("greet with a name embeds the name", () => {
    expect(greet("acme")).toContain("acme")
  })
})

describe("dynamic templated lines", () => {
  test("nameSkipAhead embeds the project name", () => {
    expect(verney.dyn.nameSkipAhead("siketaps")).toContain("siketaps")
  })

  test("pythonHint embeds the version", () => {
    expect(verney.dyn.pythonHint("0.10.8")).toContain("0.10.8")
  })

  test("pythonRecap negative case is stable", () => {
    expect(verney.dyn.pythonRecap(false)).toBe("no python")
  })

  test("pythonRecap positive case embeds version when given", () => {
    expect(verney.dyn.pythonRecap(true, "0.10.8")).toBe("uv 0.10.8")
    expect(verney.dyn.pythonRecap(true)).toBe("python")
  })
})
