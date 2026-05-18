import { test, expect, describe } from "bun:test"
import { resolveCondition, processTemplate } from "../utils/template.js"

describe("resolveCondition", () => {
  describe("no prefix — always pass through", () => {
    test("plain filename", () => {
      expect(resolveCondition("index.ts", { authMode: "zitadel" }))
        .toEqual({ skip: false, outputName: "index.ts" })
    })
    test("dotfile", () => {
      expect(resolveCondition(".env.example", { authMode: "local" }))
        .toEqual({ skip: false, outputName: ".env.example" })
    })
  })

  describe("authMode conditions", () => {
    test("[zitadel] included when authMode=zitadel", () => {
      expect(resolveCondition("[zitadel]auth.ts", { authMode: "zitadel" }))
        .toEqual({ skip: false, outputName: "auth.ts" })
    })
    test("[zitadel] skipped when authMode=local", () => {
      expect(resolveCondition("[zitadel]auth.ts", { authMode: "local" }))
        .toEqual({ skip: true, outputName: "auth.ts" })
    })
    test("[local] included when authMode=local", () => {
      expect(resolveCondition("[local]auth.ts", { authMode: "local" }))
        .toEqual({ skip: false, outputName: "auth.ts" })
    })
    test("[local] skipped when authMode=zitadel", () => {
      expect(resolveCondition("[local]auth.ts", { authMode: "zitadel" }))
        .toEqual({ skip: true, outputName: "auth.ts" })
    })
  })

  describe("serviceFramework conditions", () => {
    test("[elysia] included when serviceFramework=elysia", () => {
      expect(resolveCondition("[elysia]index.ts", { serviceFramework: "elysia" }))
        .toEqual({ skip: false, outputName: "index.ts" })
    })
    test("[litestar] included when serviceFramework=litestar", () => {
      expect(resolveCondition("[litestar]main.py", { serviceFramework: "litestar" }))
        .toEqual({ skip: false, outputName: "main.py" })
    })
    test("[litestar] skipped when serviceFramework=elysia", () => {
      expect(resolveCondition("[litestar]main.py", { serviceFramework: "elysia" }))
        .toEqual({ skip: true, outputName: "main.py" })
    })
  })

  describe("combined data (auth + framework)", () => {
    const data = { authMode: "zitadel", serviceFramework: "elysia" }
    test("[zitadel] passes through", () => {
      expect(resolveCondition("[zitadel]schema.ts", data).skip).toBe(false)
    })
    test("[local] is skipped", () => {
      expect(resolveCondition("[local]schema.ts", data).skip).toBe(true)
    })
    test("[elysia] passes through", () => {
      expect(resolveCondition("[elysia]index.ts", data).skip).toBe(false)
    })
    test("[litestar] is skipped", () => {
      expect(resolveCondition("[litestar]main.py", data).skip).toBe(true)
    })
  })

  describe("outputName strips prefix", () => {
    test("strips [zitadel] prefix", () => {
      expect(resolveCondition("[zitadel]auth.ts", { authMode: "zitadel" }).outputName)
        .toBe("auth.ts")
    })
    test("strips [local] prefix", () => {
      expect(resolveCondition("[local].env.example", { authMode: "local" }).outputName)
        .toBe(".env.example")
    })
  })

  describe("unknown condition — no match", () => {
    test("unrecognised tag is skipped", () => {
      expect(resolveCondition("[unknown]file.ts", { authMode: "zitadel" }).skip).toBe(true)
    })
  })
})

describe("processTemplate", () => {
  test("basic substitution", () => {
    expect(processTemplate("Hello {{name}}!", { name: "world" })).toBe("Hello world!")
  })

  test("dashCase helper", () => {
    expect(processTemplate("{{dashCase name}}", { name: "myApp" })).toBe("my-app")
    expect(processTemplate("{{dashCase name}}", { name: "MyBigApp" })).toBe("my-big-app")
  })

  test("snakeCase helper", () => {
    expect(processTemplate("{{snakeCase name}}", { name: "myApp" })).toBe("my_app")
  })

  test("constantCase helper", () => {
    expect(processTemplate("{{constantCase name}}", { name: "myApp" })).toBe("MY_APP")
  })

  test("pascalCase helper", () => {
    expect(processTemplate("{{pascalCase name}}", { name: "my-app" })).toBe("MyApp")
  })

  test("titleCase helper", () => {
    expect(processTemplate("{{titleCase name}}", { name: "my-app" })).toBe("My App")
  })

  test("cb helper emits closing brace", () => {
    expect(processTemplate("{{cb}}", {})).toBe("}")
  })

  test("eq helper — true branch", () => {
    expect(processTemplate('{{#if (eq a "x")}}yes{{/if}}', { a: "x" })).toBe("yes")
  })

  test("eq helper — false branch", () => {
    expect(processTemplate('{{#if (eq a "x")}}yes{{else}}no{{/if}}', { a: "y" })).toBe("no")
  })

  test("includes helper — match", () => {
    expect(processTemplate('{{#if (includes s "foo")}}yes{{/if}}', { s: "foobar" })).toBe("yes")
  })

  test("includes helper — no match", () => {
    expect(processTemplate('{{#if (includes s "baz")}}yes{{else}}no{{/if}}', { s: "foobar" })).toBe("no")
  })

  test("noEscape — angle brackets not escaped", () => {
    expect(processTemplate("{{val}}", { val: "<div>" })).toBe("<div>")
  })
})
