import { test, expect, describe, beforeAll, afterAll } from "bun:test"
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generateBase } from "../generators/base.js"
import { generateService } from "../generators/service.js"
import { generatePortal } from "../generators/portal.js"
import { generateBackoffice } from "../generators/backoffice.js"
import { regenerateDocker } from "../generators/docker.js"

const TEMPLATES_DIR = new URL("../../templates", import.meta.url).pathname

const BASE_CONFIG = {
  name: "test-app",
  packageManagers: { js: { name: "bun" as const, version: "1.3.10" } },
  moonVersion: "2.1.4",
  useZitadel: false,
  multiTenant: false,
  addons: [],
  apps: [],
}

// ─── generateBase ────────────────────────────────────────────────────

describe("generateBase", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-base-"))
    generateBase(dir, TEMPLATES_DIR, BASE_CONFIG)
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("creates package.json with project name", () => {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    expect(pkg.name).toBe("test-app")
  })

  test("creates .gitignore", () => {
    expect(existsSync(join(dir, ".gitignore"))).toBe(true)
  })

  test("creates moon workspace config", () => {
    expect(existsSync(join(dir, ".moon/workspace.yml"))).toBe(true)
  })

  test("creates moon toolchain config", () => {
    expect(existsSync(join(dir, ".moon/toolchain.yml"))).toBe(true)
  })

  test("creates .prototools", () => {
    expect(existsSync(join(dir, ".prototools"))).toBe(true)
  })
})

// ─── generateService (elysia + local auth) ──────────────────────────

describe("generateService — elysia + local auth", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-svc-"))
    generateService(dir, TEMPLATES_DIR, {
      name: "users",
      projectName: "test-app",
      authMode: "local",
      serviceFramework: "elysia",
      apiSource: "users",
      apiPort: "4001",
      portalPort: "3001",
      backofficePort: "5175",
      packageManager: "bun",
      packageManagerVersion: "1.3.10",
      moonVersion: "2.1.4",
      multiTenant: false,
      subscription: false,
    })
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("creates service app directory", () => {
    expect(existsSync(join(dir, "apps/users-service"))).toBe(true)
  })

  test("creates service package.json with rendered name", () => {
    const pkg = JSON.parse(readFileSync(join(dir, "apps/users-service/package.json"), "utf-8"))
    expect(pkg.name).toBe("users-service")
  })

  test("creates db package", () => {
    expect(existsSync(join(dir, "packages/db-users"))).toBe(true)
  })

  test("creates api-client package", () => {
    expect(existsSync(join(dir, "packages/users-service-client"))).toBe(true)
  })

  test("copies [local] auth file, not [zitadel]", () => {
    expect(existsSync(join(dir, "apps/users-service/src/lib/auth.ts"))).toBe(true)
  })

  test("creates Dockerfile", () => {
    expect(existsSync(join(dir, "apps/users-service/Dockerfile"))).toBe(true)
  })

  test(".env.example contains PORT", () => {
    const env = readFileSync(join(dir, "apps/users-service/.env.example"), "utf-8")
    expect(env).toContain("PORT=4001")
  })

  test("index.ts references service name", () => {
    const src = readFileSync(join(dir, "apps/users-service/src/index.ts"), "utf-8")
    expect(src).toContain("Users API")
  })
})

// ─── generateService (elysia + zitadel) ─────────────────────────────

describe("generateService — elysia + zitadel", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-svc-z-"))
    generateService(dir, TEMPLATES_DIR, {
      name: "payments",
      projectName: "test-app",
      authMode: "zitadel",
      serviceFramework: "elysia",
      apiSource: "payments",
      apiPort: "4002",
      portalPort: "3001",
      backofficePort: "5175",
      packageManager: "bun",
      packageManagerVersion: "1.3.10",
      moonVersion: "2.1.4",
      multiTenant: false,
      subscription: false,
    })
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("creates service app directory", () => {
    expect(existsSync(join(dir, "apps/payments-service"))).toBe(true)
  })

  test("[zitadel] auth file present, [local] absent", () => {
    expect(existsSync(join(dir, "apps/payments-service/src/lib/auth.ts"))).toBe(true)
  })

  test(".env.example contains ZITADEL vars", () => {
    const env = readFileSync(join(dir, "apps/payments-service/.env.example"), "utf-8")
    expect(env).toContain("ZITADEL_ISSUER")
  })
})

// ─── generateService (litestar) ─────────────────────────────────────

describe("generateService — litestar", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-py-"))
    generateService(dir, TEMPLATES_DIR, {
      name: "billing",
      projectName: "test-app",
      authMode: "local",
      serviceFramework: "litestar",
      apiSource: "billing",
      apiPort: "4003",
      portalPort: "3001",
      backofficePort: "5175",
      packageManager: "bun",
      packageManagerVersion: "1.3.10",
      moonVersion: "2.1.4",
      multiTenant: false,
      subscription: false,
    })
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("creates python service directory", () => {
    expect(existsSync(join(dir, "apps/billing-service"))).toBe(true)
  })

  test("creates pyproject.toml", () => {
    expect(existsSync(join(dir, "apps/billing-service/pyproject.toml"))).toBe(true)
  })

  test("creates litestar api-client package", () => {
    expect(existsSync(join(dir, "packages/billing-service-client"))).toBe(true)
  })

  test("does NOT create db package (litestar uses tortoise)", () => {
    expect(existsSync(join(dir, "packages/db-billing"))).toBe(false)
  })
})

// ─── generatePortal ──────────────────────────────────────────────────

describe("generatePortal — local auth", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-portal-"))
    generatePortal(dir, TEMPLATES_DIR, {
      name: "customer",
      projectName: "test-app",
      authMode: "local",
      serviceFramework: "elysia",
      apiSource: "users",
      apiPort: "4001",
      portalPort: "3001",
      backofficePort: "5175",
      packageManager: "bun",
      packageManagerVersion: "1.3.10",
      moonVersion: "2.1.4",
      multiTenant: false,
      subscription: false,
    })
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("creates portal directory", () => {
    expect(existsSync(join(dir, "apps/portal-customer"))).toBe(true)
  })

  test("copies session.ts from shared/local", () => {
    expect(existsSync(join(dir, "apps/portal-customer/src/lib/auth/session.ts"))).toBe(true)
  })

  test("copies server-auth.ts from shared/local", () => {
    expect(existsSync(join(dir, "apps/portal-customer/src/server/auth.ts"))).toBe(true)
  })

  test("copies login.tsx from shared/local", () => {
    expect(existsSync(join(dir, "apps/portal-customer/src/routes/_auth/login.tsx"))).toBe(true)
  })

  test("does NOT copy zitadel callback", () => {
    expect(existsSync(join(dir, "apps/portal-customer/src/routes/auth/callback.tsx"))).toBe(false)
  })

  test("creates shared UI package", () => {
    expect(existsSync(join(dir, "packages/ui"))).toBe(true)
  })
})

describe("generatePortal — zitadel auth", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-portal-z-"))
    generatePortal(dir, TEMPLATES_DIR, {
      name: "customer",
      projectName: "test-app",
      authMode: "zitadel",
      serviceFramework: "elysia",
      apiSource: "users",
      apiPort: "4001",
      portalPort: "3001",
      backofficePort: "5175",
      packageManager: "bun",
      packageManagerVersion: "1.3.10",
      moonVersion: "2.1.4",
      multiTenant: false,
      subscription: false,
    })
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("copies zitadel callback", () => {
    expect(existsSync(join(dir, "apps/portal-customer/src/routes/auth/callback.tsx"))).toBe(true)
  })
})

// ─── regenerateDocker ────────────────────────────────────────────────

describe("regenerateDocker — local auth", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-docker-"))
    const config = {
      ...BASE_CONFIG,
      apps: [
        { name: "users", type: "service" as const, dirName: "users-service", serviceFramework: "elysia" as const, port: "4001" },
        { name: "main", type: "portal" as const, dirName: "portal-main", port: "3001", apiSource: "users" },
        { name: "admin", type: "backoffice" as const, dirName: "backoffice-admin", port: "5175", apiSource: "users" },
      ],
    }
    regenerateDocker(dir, TEMPLATES_DIR, config)
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("creates docker-compose.yml", () => {
    expect(existsSync(join(dir, "infra/docker-compose.yml"))).toBe(true)
  })

  test("contains postgres service for users", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("db-users:")
  })

  test("contains users-service", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("users-service:")
  })

  test("contains portal-main", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("portal-main:")
  })

  test("contains backoffice-admin", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("backoffice-admin:")
  })

  test("does NOT contain zitadel services", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).not.toContain("zitadel-api:")
  })
})

describe("regenerateDocker — zitadel auth", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "vrn-docker-z-"))
    const config = {
      ...BASE_CONFIG,
      useZitadel: true,
      apps: [
        { name: "users", type: "service" as const, dirName: "users-service", serviceFramework: "elysia" as const, port: "4001" },
      ],
    }
    regenerateDocker(dir, TEMPLATES_DIR, config)
  })

  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  test("contains zitadel services", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("zitadel-api:")
    expect(yml).toContain("zitadel-db:")
    expect(yml).toContain("zitadel-login:")
  })

  test("contains zitadel-bootstrap volume", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("zitadel-bootstrap")
  })

  test("service depends on zitadel-api", () => {
    const yml = readFileSync(join(dir, "infra/docker-compose.yml"), "utf-8")
    expect(yml).toContain("zitadel-api")
  })
})
