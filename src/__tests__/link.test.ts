import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import yaml from "yaml"
import { linkServices } from "../actions/link.js"
import { ProjectConfig } from "../types.js"

function makeProject(dir: string, config: ProjectConfig) {
  writeFileSync(join(dir, "vrn.yaml"), yaml.stringify(config), "utf-8")
}

function makeServicePkg(dir: string, dirName: string, extra: Record<string, unknown> = {}) {
  const pkgDir = join(dir, "apps", dirName)
  mkdirSync(pkgDir, { recursive: true })
  writeFileSync(
    join(pkgDir, "package.json"),
    JSON.stringify({ name: dirName, dependencies: {}, ...extra }, null, 2) + "\n",
    "utf-8"
  )
}

const BASE_CONFIG: ProjectConfig = {
  name: "test-app",
  packageManager: "bun",
  packageManagerVersion: "1.3.10",
  moonVersion: "2.1.4",
  useZitadel: false,
  apps: [],
}

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vrn-link-"))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("linkServices — success", () => {
  test("updates vrn.yaml links field", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "users-service")

    linkServices(dir, config, "users", "orders")

    const saved = yaml.parse(readFileSync(join(dir, "vrn.yaml"), "utf-8")) as ProjectConfig
    const usersApp = saved.apps.find(a => a.name === "users")
    expect(usersApp?.links).toContain("orders")
  })

  test("adds workspace dependency to source package.json", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "users-service")

    const result = linkServices(dir, config, "users", "orders")

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.addedDep).toBe(true)

    const pkg = JSON.parse(readFileSync(join(dir, "apps/users-service/package.json"), "utf-8"))
    expect(pkg.dependencies["@workspace/orders-service-client"]).toBe("workspace:*")
  })

  test("returns addedDep=false when dep already present", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "users-service", {
      dependencies: { "@workspace/orders-service-client": "workspace:*" },
    })

    const result = linkServices(dir, config, "users", "orders")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.addedDep).toBe(false)
  })

  test("returns addedDep=false and skips package.json if file missing", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)
    // intentionally NO makeServicePkg

    const result = linkServices(dir, config, "users", "orders")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.addedDep).toBe(false)
    expect(existsSync(join(dir, "apps/users-service/package.json"))).toBe(false)
  })
})

describe("linkServices — validation errors", () => {
  test("returns self-link when source === target", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
      ],
    }
    makeProject(dir, config)

    const result = linkServices(dir, config, "users", "users")
    expect(result).toMatchObject({ ok: false, reason: "self-link" })
  })

  test("returns source-not-found for unknown source", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)

    const result = linkServices(dir, config, "ghost", "orders")
    expect(result).toMatchObject({ ok: false, reason: "source-not-found" })
  })

  test("returns target-not-found for unknown target", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
      ],
    }
    makeProject(dir, config)

    const result = linkServices(dir, config, "users", "ghost")
    expect(result).toMatchObject({ ok: false, reason: "target-not-found" })
  })

  test("returns already-linked when link already exists", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001", links: ["orders"] },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)

    const result = linkServices(dir, config, "users", "orders")
    expect(result).toMatchObject({ ok: false, reason: "already-linked" })
  })

  test("returns source-not-found for non-service type (portal)", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "main", type: "portal", dirName: "portal-main", port: "3001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)

    const result = linkServices(dir, config, "main", "orders")
    expect(result).toMatchObject({ ok: false, reason: "source-not-found" })
  })
})
