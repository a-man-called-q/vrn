import { describe, expect, test } from "bun:test"
import { phaseSpeech as createPhaseSpeech } from "../commands/create.js"
import { phaseSpeech as linkPhaseSpeech } from "../commands/link.js"
import { phaseSpeech as addPhaseSpeech } from "../commands/add.js"

describe("create phaseSpeech", () => {
  test("probe phase asks verney to look around and shows a status line", () => {
    const speech = createPhaseSpeech({ kind: "probe" })
    expect(speech.ask).toBeTruthy()
    expect(speech.status).toBe("sniffing toolchain")
  })

  test("resolving phase embeds the tool name in the ask", () => {
    const speech = createPhaseSpeech({ kind: "resolving", probe: {} as any, answers: {}, tool: "bun" as any })
    expect(speech.ask).toContain("bun")
    expect(speech.status).toBe("giving it 6s this time")
  })

  test("scaffold phase shows the target path in status", () => {
    const speech = createPhaseSpeech({
      kind: "scaffold",
      config: { name: "siketaps" } as any,
      targetDir: "/tmp/siketaps",
    })
    expect(speech.status).toBe("writing ./siketaps")
  })

  test("done phase delivers next steps in details", () => {
    const speech = createPhaseSpeech({ kind: "done", name: "siketaps" })
    expect(speech.closing).toContain("siketaps")
    expect(speech.details).toContain("  → cd siketaps")
    expect(speech.details).toContain("  → bunx vrn gen service     # backend api")
  })

  test("error phase surfaces the message in details", () => {
    const speech = createPhaseSpeech({ kind: "error", message: "disk full" })
    expect(speech.error).toBeTruthy()
    expect(speech.details).toEqual(["disk full"])
  })

  test("cancelled phase reads a goodbye line", () => {
    const speech = createPhaseSpeech({ kind: "cancelled" })
    expect(speech.ask).toBeTruthy()
  })
})

describe("link phaseSpeech", () => {
  test("linking phase shows wiring status", () => {
    const speech = linkPhaseSpeech({ kind: "linking" }, "users", "billing")
    expect(speech.ask).toContain("users")
    expect(speech.ask).toContain("billing")
    expect(speech.status).toBe("wiring it up")
  })

  test("installing phase lists the dep that was added", () => {
    const speech = linkPhaseSpeech(
      {
        kind: "installing",
        addedDep: "@vrn/billing-service-client",
        clientPkg: "@vrn/billing-service-client",
        servicePkgPath: "apps/users-service/package.json",
      },
      "users",
      "billing",
    )
    expect(speech.details?.[0]).toContain("@vrn/billing-service-client")
    expect(speech.details?.[0]).toContain("apps/users-service/package.json")
    expect(speech.status).toBeTruthy()
  })

  test("warn phase yields a yellow warning", () => {
    const speech = linkPhaseSpeech({ kind: "warn", message: "already linked" }, "a", "b")
    expect(speech.warn).toBe("already linked")
    expect(speech.error).toBeUndefined()
  })

  test("error phase yields a red error", () => {
    const speech = linkPhaseSpeech({ kind: "error", message: "boom" }, "a", "b")
    expect(speech.error).toBe("boom")
    expect(speech.warn).toBeUndefined()
  })

  test("done phase with addedDep includes it in details", () => {
    const speech = linkPhaseSpeech(
      {
        kind: "done",
        addedDep: {
          clientPkg: "@vrn/billing-service-client",
          servicePkgPath: "apps/users-service/package.json",
        },
      },
      "users",
      "billing",
    )
    expect(speech.details?.length).toBe(1)
    expect(speech.closing).toContain("users")
  })

  test("done phase without addedDep yields empty details and a closing", () => {
    const speech = linkPhaseSpeech({ kind: "done" }, "users", "billing")
    expect(speech.details).toEqual([])
    expect(speech.closing).toContain("users")
  })
})

describe("add phaseSpeech", () => {
  test("installing phase shows the addon name in both ask and status", () => {
    const speech = addPhaseSpeech({ kind: "installing" }, "subscription")
    expect(speech.ask).toContain("subscription")
    expect(speech.status).toContain("subscription")
  })

  test("error phase keeps the addon context and shows the failure", () => {
    const speech = addPhaseSpeech({ kind: "error", message: "schema clash" }, "subscription")
    expect(speech.ask).toContain("subscription")
    expect(speech.error).toContain("subscription")
    expect(speech.details).toEqual(["schema clash"])
  })

  test("done phase shows a closing and a follow-up hint", () => {
    const speech = addPhaseSpeech({ kind: "done" }, "subscription")
    expect(speech.closing).toContain("subscription")
    expect(speech.details?.length).toBeGreaterThan(0)
  })
})
