import { describe, expect, test } from "bun:test"
import {
  advanceSkip,
  applyPreset,
  commitStep,
  findPrevActiveIdx,
  initialSnapshot,
  jumpBack,
  markDone,
  recapParts,
  setHover,
  wizardSpeech,
  type Step,
} from "../ui/wizard-core.js"

// helpers to build minimal Step fixtures.
function textStep(id: string, extras: Partial<Step> = {}): Step {
  return {
    kind: "text",
    id,
    label: id,
    prompt: `enter ${id}`,
    recap: v => `${id}:${v}`,
    ...(extras as any),
  } as Step
}

function selectStep(id: string, values: string[], extras: Partial<Step> = {}): Step {
  return {
    kind: "select",
    id,
    label: id,
    prompt: `pick ${id}`,
    options: values.map(v => ({ value: v, label: v })),
    recap: v => `${id}:${v}`,
    hoverComment: v => `hovering ${v}`,
    reaction: v => `committed ${v}`,
    ...(extras as any),
  } as Step
}

describe("initialSnapshot", () => {
  test("starts at idx 0 with no answers, intro mood, not done", () => {
    const snap = initialSnapshot()
    expect(snap).toEqual({
      idx: 0,
      answers: {},
      mood: { kind: "intro" },
      hovered: undefined,
      done: false,
    })
  })
})

describe("commitStep", () => {
  test("stores the answer, advances idx, sets react mood, clears hover", () => {
    const step = textStep("name")
    const snap = setHover(initialSnapshot(), "anything")
    const next = commitStep(snap, step, "siketaps", "got it")

    expect(next.idx).toBe(1)
    expect(next.answers).toEqual({ name: "siketaps" })
    expect(next.mood).toEqual({ kind: "react", line: "got it" })
    expect(next.hovered).toBeUndefined()
  })
})

describe("applyPreset", () => {
  test("commits a preset value without clearing hover (used during auto-advance)", () => {
    const step = textStep("name")
    const next = applyPreset(initialSnapshot(), step, "siketaps", "skip ahead")

    expect(next.idx).toBe(1)
    expect(next.answers).toEqual({ name: "siketaps" })
    expect(next.mood).toEqual({ kind: "react", line: "skip ahead" })
  })
})

describe("advanceSkip", () => {
  test("bumps idx without touching answers or mood", () => {
    const before = initialSnapshot()
    const after = advanceSkip(before)
    expect(after.idx).toBe(1)
    expect(after.answers).toEqual({})
    expect(after.mood).toEqual({ kind: "intro" })
  })
})

describe("findPrevActiveIdx", () => {
  test("returns null when there's no previous step", () => {
    const steps = [textStep("a"), textStep("b")]
    expect(findPrevActiveIdx(steps, 0, {})).toBeNull()
  })

  test("returns the step right behind the cursor", () => {
    const steps = [textStep("a"), textStep("b"), textStep("c")]
    expect(findPrevActiveIdx(steps, 2, {})).toBe(1)
  })

  test("skips steps whose skipIf is true", () => {
    const steps: Step[] = [
      textStep("a"),
      textStep("b", { skipIf: () => true }),
      textStep("c"),
    ]
    expect(findPrevActiveIdx(steps, 2, {})).toBe(0)
  })

  test("skips steps that were auto-resolved via preset", () => {
    const steps: Step[] = [
      textStep("a"),
      textStep("b", { preset: { value: "ok" } }),
      textStep("c"),
    ]
    expect(findPrevActiveIdx(steps, 2, { b: "ok" })).toBe(0)
  })
})

describe("jumpBack", () => {
  test("rewinds to the previous active idx and sets back mood", () => {
    const steps = [textStep("a"), textStep("b"), textStep("c")]
    const snap = { ...initialSnapshot(), idx: 2, answers: { a: "x", b: "y" } }
    const next = jumpBack(snap, steps, "back to it")

    expect(next.idx).toBe(1)
    expect(next.mood).toEqual({ kind: "back", line: "back to it" })
    expect(next.hovered).toBeUndefined()
  })

  test("returns snap unchanged when there's nowhere to go back", () => {
    const steps = [textStep("a")]
    const snap = initialSnapshot()
    expect(jumpBack(snap, steps, "back")).toBe(snap)
  })
})

describe("recapParts", () => {
  test("collects recap phrases from committed steps before idx", () => {
    const steps = [textStep("a"), textStep("b"), textStep("c")]
    const parts = recapParts(steps, 2, { a: "x", b: "y" })
    expect(parts).toEqual(["a:x", "b:y"])
  })

  test("ignores steps whose recap returns empty/undefined", () => {
    const steps: Step[] = [
      textStep("a", { recap: () => undefined }),
      textStep("b", { recap: () => "" }),
      textStep("c"),
    ]
    const parts = recapParts(steps, 3, { a: "x", b: "y", c: "z" })
    expect(parts).toEqual(["c:z"])
  })

  test("skips steps whose skipIf is true", () => {
    const steps: Step[] = [
      textStep("a"),
      textStep("b", { skipIf: () => true }),
      textStep("c"),
    ]
    const parts = recapParts(steps, 3, { a: "x", c: "z" })
    expect(parts).toEqual(["a:x", "c:z"])
  })
})

describe("markDone", () => {
  test("flips the done flag", () => {
    const next = markDone(initialSnapshot())
    expect(next.done).toBe(true)
  })
})

describe("setHover", () => {
  test("replaces the hovered value", () => {
    const next = setHover(initialSnapshot(), "x")
    expect(next.hovered).toBe("x")
  })
})

describe("wizardSpeech", () => {
  test("intro mood at start, no recap, ask + hint", () => {
    const steps = [textStep("a", { hint: "lowercase only" })]
    const snap = initialSnapshot()
    const speech = wizardSpeech(snap, steps[0]!, steps, "let's start")

    expect(speech.mood).toEqual({ text: "let's start", tone: "neutral" })
    expect(speech.recap).toBeUndefined()
    expect(speech.ask).toBe("enter a")
    expect(speech.hint).toBe("lowercase only")
    expect(speech.hover).toBeUndefined()
  })

  test("react mood replaces intro after a commit", () => {
    const steps = [textStep("a"), textStep("b")]
    const snap = commitStep(initialSnapshot(), steps[0]!, "x", "got it")
    const speech = wizardSpeech(snap, steps[1]!, steps, "let's start")
    expect(speech.mood).toEqual({ text: "got it", tone: "neutral" })
  })

  test("back mood after a jumpBack", () => {
    const steps = [textStep("a"), textStep("b")]
    const after = commitStep(initialSnapshot(), steps[0]!, "x", "got it")
    const snap = jumpBack(after, steps, "back to it")
    const speech = wizardSpeech(snap, steps[0]!, steps, "let's start")
    expect(speech.mood).toEqual({ text: "back to it", tone: "back" })
  })

  test("recap composes phrases from committed prior steps", () => {
    const steps = [textStep("a"), textStep("b"), textStep("c")]
    const snap = { ...initialSnapshot(), idx: 2, answers: { a: "x", b: "y" } }
    const speech = wizardSpeech(snap, steps[2]!, steps, "intro")
    expect(speech.recap).toBe("a:x, b:y")
  })

  test("hover commentary takes priority over hint", () => {
    const steps = [selectStep("auth", ["local", "zitadel"], { hint: "static" })]
    const snap = setHover(initialSnapshot(), "zitadel")
    const speech = wizardSpeech(snap, steps[0]!, steps, "intro")
    expect(speech.hover).toBe("hovering zitadel")
    expect(speech.hint).toBeUndefined()
  })

  test("hint shows when nothing is hovered", () => {
    const steps = [selectStep("auth", ["local"], { hint: "static fallback" })]
    const speech = wizardSpeech(initialSnapshot(), steps[0]!, steps, "intro")
    expect(speech.hint).toBe("static fallback")
    expect(speech.hover).toBeUndefined()
  })
})
