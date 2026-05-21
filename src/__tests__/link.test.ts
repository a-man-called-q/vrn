import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import yaml from "yaml"
import { linkAll, linkServices } from "../actions/link.js"
import { AppEntry, ProjectConfig } from "../types.js"

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
  packageManagers: { js: { name: "bun", version: "1.3.10" } },
  moonVersion: "2.1.4",
  useZitadel: false,
  multiTenant: false,
  addons: [],
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

  test("returns target-not-found when target exists but is not a service", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "ops", type: "backoffice", dirName: "backoffice-ops", port: "3002" },
      ],
    }
    makeProject(dir, config)

    const result = linkServices(dir, config, "users", "ops")
    expect(result).toMatchObject({ ok: false, reason: "target-not-found" })
  })
})

describe("linkServices — frontend sources", () => {
  test("links a backoffice to a service and adds the client dep", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "ops", type: "backoffice", dirName: "backoffice-ops", port: "3002" },
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "backoffice-ops")

    const r1 = linkServices(dir, config, "ops", "users")
    const r2 = linkServices(dir, config, "ops", "orders")

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)

    const saved = yaml.parse(readFileSync(join(dir, "vrn.yaml"), "utf-8")) as ProjectConfig
    const opsApp = saved.apps.find(a => a.name === "ops")
    expect(opsApp?.links).toEqual(["users", "orders"])

    const pkg = JSON.parse(readFileSync(join(dir, "apps/backoffice-ops/package.json"), "utf-8"))
    expect(pkg.dependencies["@workspace/users-service-client"]).toBe("workspace:*")
    expect(pkg.dependencies["@workspace/orders-service-client"]).toBe("workspace:*")
  })

  test("links a portal to a service", () => {
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        { name: "main", type: "portal", dirName: "portal-main", port: "3001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "portal-main")

    const result = linkServices(dir, config, "main", "orders")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.addedDep).toBe(true)

    const pkg = JSON.parse(readFileSync(join(dir, "apps/portal-main/package.json"), "utf-8"))
    expect(pkg.dependencies["@workspace/orders-service-client"]).toBe("workspace:*")
  })
})

describe("linkAll", () => {
  test("links every picked registered service and writes deps", () => {
    const backoffice: AppEntry = {
      name: "ops",
      type: "backoffice",
      dirName: "backoffice-ops",
      port: "3002",
    }
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        backoffice,
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
        { name: "orders", type: "service", dirName: "orders-service", port: "4002" },
        { name: "billing", type: "service", dirName: "billing-service", port: "4003" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "backoffice-ops")

    const linked = linkAll(dir, config, backoffice, ["users", "orders", "billing"])
    expect(linked).toEqual(["users", "orders", "billing"])

    const pkg = JSON.parse(readFileSync(join(dir, "apps/backoffice-ops/package.json"), "utf-8"))
    expect(pkg.dependencies["@workspace/users-service-client"]).toBe("workspace:*")
    expect(pkg.dependencies["@workspace/orders-service-client"]).toBe("workspace:*")
    expect(pkg.dependencies["@workspace/billing-service-client"]).toBe("workspace:*")
  })

  test("works for service-to-service links", () => {
    const svcB: AppEntry = {
      name: "orders",
      type: "service",
      dirName: "orders-service",
      port: "4002",
    }
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        svcB,
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "orders-service")

    expect(linkAll(dir, config, svcB, ["users"])).toEqual(["users"])

    const pkg = JSON.parse(readFileSync(join(dir, "apps/orders-service/package.json"), "utf-8"))
    expect(pkg.dependencies["@workspace/users-service-client"]).toBe("workspace:*")
  })

  test("silently skips unknown names, self-references, and duplicates", () => {
    const backoffice: AppEntry = {
      name: "ops",
      type: "backoffice",
      dirName: "backoffice-ops",
      port: "3002",
    }
    const config: ProjectConfig = {
      ...BASE_CONFIG,
      apps: [
        backoffice,
        { name: "users", type: "service", dirName: "users-service", port: "4001" },
      ],
    }
    makeProject(dir, config)
    makeServicePkg(dir, "backoffice-ops")

    const linked = linkAll(dir, config, backoffice, ["users", "ghost", "users", "ops"])
    expect(linked).toEqual(["users"])
  })

  test("returns [] when picks is empty", () => {
    const backoffice: AppEntry = {
      name: "ops",
      type: "backoffice",
      dirName: "backoffice-ops",
      port: "3002",
    }
    const config: ProjectConfig = { ...BASE_CONFIG, apps: [backoffice] }
    makeProject(dir, config)

    expect(linkAll(dir, config, backoffice, [])).toEqual([])
  })
})
