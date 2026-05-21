import { join } from "node:path"
import { writeFileSync, mkdirSync } from "node:fs"
import yaml from "yaml"
import { kebabCase, snakeCase, constantCase } from "change-case"

import { ProjectConfig, AppEntry } from "../../types.js"
import { buildZitadelBlock } from "./zitadel.js"
import type { ComposeValue } from "./types.js"

function buildServiceBlock(app: AppEntry, authMode: string): Record<string, ComposeValue> {
  const kn = kebabCase(app.name)
  const sn = snakeCase(app.name)
  const cn = constantCase(app.name)

  const apiEnv: Record<string, string> = {
    PORT: app.port,
    BETTER_AUTH_SECRET: `\${APP_${cn}_BETTER_AUTH_SECRET:?required}`,
    BETTER_AUTH_URL: `\${API_${cn}_URL:-http://${kn}-service.localhost}`,
    ALLOWED_ORIGINS: `\${BACKOFFICE_${cn}_APP_URL:-http://backoffice-${kn}.localhost},\${PORTAL_${cn}_APP_URL:-http://portal-${kn}.localhost}`,
  }

  if (authMode === "zitadel") {
    apiEnv.ZITADEL_ISSUER = `\${ZITADEL_PUBLIC_URL:-https://auth.localhost}`
    apiEnv.ZITADEL_CLIENT_ID = `\${API_${cn}_ZITADEL_CLIENT_ID:-}`
    apiEnv.ZITADEL_CLIENT_SECRET = `\${API_${cn}_ZITADEL_CLIENT_SECRET:?required}`
  }

  const apiDependsOn: Record<string, ComposeValue> = {
    [`db-${kn}`]: { condition: "service_healthy" },
  }
  if (authMode === "zitadel") {
    apiDependsOn["zitadel-api"] = { condition: "service_healthy" }
  }

  return {
    [`db-${kn}`]: {
      image: "postgres:17-alpine",
      restart: "unless-stopped",
      networks: ["proxy"],
      environment: {
        POSTGRES_USER: `\${APP_${cn}_DB_USER:-postgres}`,
        POSTGRES_PASSWORD: `\${APP_${cn}_DB_PASSWORD:?required}`,
        POSTGRES_DB: `\${APP_${cn}_DB_NAME:-db_${sn}}`,
      },
      volumes: [`./db-${kn}-data:/var/lib/postgresql/data`],
      healthcheck: {
        test: ["CMD-SHELL", `pg_isready -d \${APP_${cn}_DB_NAME:-db_${sn}} -U \${APP_${cn}_DB_USER:-postgres}`],
        interval: "10s",
        timeout: "30s",
        retries: 10,
        start_period: "20s",
      },
    },
    [`${kn}-service`]: {
      build: {
        context: "../",
        dockerfile: `apps/${kn}-service/Dockerfile`,
      },
      restart: "unless-stopped",
      networks: ["proxy"],
      environment: apiEnv,
      healthcheck: {
        test: ["CMD", "curl", "-f", `http://localhost:${app.port}/health`],
        interval: "10s",
        timeout: "5s",
        retries: 5,
        start_period: "10s",
      },
      depends_on: apiDependsOn,
    },
  }
}

function buildFrontendBlock(
  app: AppEntry,
  config: ProjectConfig,
  kind: "portal" | "backoffice"
): Record<string, ComposeValue> {
  const kn = kebabCase(app.name)
  const cn = constantCase(app.name)
  const authMode = config.useZitadel ? "zitadel" : "local"
  const envPrefix = kind === "backoffice" ? "BACKOFFICE" : "PORTAL"
  const dirPrefix = kind

  const apiApp = config.apps.find(s => s.name === app.apiSource && s.type === "service")
  const apiPort = apiApp?.port ?? "4001"
  const apiKn = kebabCase(app.apiSource ?? app.name)

  const env: Record<string, string> = {
    API_URL: `http://${apiKn}-service:${apiPort}`,
    SESSION_SECRET: `\${${envPrefix}_${cn}_SESSION_SECRET:?required}`,
  }

  if (authMode === "zitadel") {
    if (kind === "backoffice") {
      env.ZITADEL_PUBLIC_URL = `\${ZITADEL_PUBLIC_URL:-https://auth.localhost}`
    }
    env.REDIRECT_URI = `\${${envPrefix}_${cn}_APP_URL:-http://${dirPrefix}-${kn}.localhost}/auth/callback`
  }

  return {
    [`${dirPrefix}-${kn}`]: {
      build: {
        context: "../",
        dockerfile: `apps/${dirPrefix}-${kn}/Dockerfile`,
      },
      restart: "unless-stopped",
      networks: ["proxy"],
      environment: env,
      depends_on: {
        [`${apiKn}-service`]: { condition: "service_healthy" },
      },
    },
  }
}

export function regenerateDocker(
  projectRoot: string,
  _templatesDir: string,
  config: ProjectConfig
): void {
  const infraDir = join(projectRoot, "infra")
  mkdirSync(infraDir, { recursive: true })

  const authMode = config.useZitadel ? "zitadel" : "local"
  const services: Record<string, ComposeValue> = {}

  for (const app of config.apps.filter(a => a.type === "service")) {
    Object.assign(services, buildServiceBlock(app, authMode))
  }
  for (const app of config.apps.filter(a => a.type === "backoffice")) {
    Object.assign(services, buildFrontendBlock(app, config, "backoffice"))
  }
  for (const app of config.apps.filter(a => a.type === "portal")) {
    Object.assign(services, buildFrontendBlock(app, config, "portal"))
  }
  if (config.useZitadel) {
    Object.assign(services, buildZitadelBlock())
  }

  const compose: Record<string, ComposeValue> = {
    services,
    networks: { proxy: { name: "proxy" } },
  }

  if (config.useZitadel) {
    compose.volumes = { "zitadel-bootstrap": {} }
  }

  writeFileSync(join(infraDir, "docker-compose.yml"), yaml.stringify(compose), "utf-8")
}
