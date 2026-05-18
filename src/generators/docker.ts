import { join } from "node:path"
import { writeFileSync, mkdirSync } from "node:fs"
import yaml from "yaml"
import { kebabCase, snakeCase, constantCase } from "change-case"
import { ProjectConfig, AppEntry } from "../types.js"

type ComposeValue = string | number | boolean | null | ComposeValue[] | { [k: string]: ComposeValue }

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

function buildZitadelBlock(): Record<string, ComposeValue> {
  return {
    "zitadel-db": {
      image: "postgres:17-alpine",
      restart: "unless-stopped",
      networks: ["proxy"],
      environment: {
        POSTGRES_USER: "${ZITADEL_DB_USER:-postgres}",
        POSTGRES_PASSWORD: "${ZITADEL_DB_PASSWORD:?required}",
        POSTGRES_DB: "zitadel",
      },
      volumes: ["./zitadel-db-data:/var/lib/postgresql/data"],
      healthcheck: {
        test: ["CMD-SHELL", "pg_isready -d zitadel -U ${ZITADEL_DB_USER:-postgres}"],
        interval: "10s",
        timeout: "30s",
        retries: 10,
        start_period: "20s",
      },
    },
    "zitadel-redis": {
      image: "redis:7-alpine",
      restart: "unless-stopped",
      networks: ["proxy"],
      command: ["--save", "", "--appendonly", "no"],
      healthcheck: {
        test: ["CMD", "redis-cli", "ping"],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
    },
    "zitadel-init": {
      image: "ghcr.io/zitadel/zitadel:${ZITADEL_VERSION:-latest}",
      restart: "no",
      command: "init",
      networks: ["proxy"],
      environment: {
        ZITADEL_DATABASE_POSTGRES_DSN: "postgresql://${ZITADEL_DB_USER:-postgres}:${ZITADEL_DB_PASSWORD}@zitadel-db:5432/zitadel?sslmode=disable",
      },
      depends_on: {
        "zitadel-db": { condition: "service_healthy" },
      },
    },
    "zitadel-setup": {
      image: "ghcr.io/zitadel/zitadel:${ZITADEL_VERSION:-latest}",
      restart: "no",
      command: "setup",
      networks: ["proxy"],
      environment: {
        ZITADEL_MASTERKEY: "${ZITADEL_MASTERKEY:?required}",
        ZITADEL_DATABASE_POSTGRES_DSN: "postgresql://${ZITADEL_DB_USER:-postgres}:${ZITADEL_DB_PASSWORD}@zitadel-db:5432/zitadel?sslmode=disable",
        ZITADEL_EXTERNALDOMAIN: "${ZITADEL_DOMAIN:-auth.localhost}",
        ZITADEL_EXTERNALPORT: "${ZITADEL_EXTERNALPORT:-80}",
        ZITADEL_EXTERNALSECURE: "${ZITADEL_EXTERNALSECURE:-false}",
        ZITADEL_TLS_ENABLED: "false",
        ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORDCHANGEREQUIRED: "false",
        ZITADEL_FIRSTINSTANCE_LOGINCLIENTPATPATH: "/zitadel/bootstrap/login-client.pat",
        ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_MACHINE_USERNAME: "login-client",
        ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_MACHINE_NAME: "Login Client",
        ZITADEL_FIRSTINSTANCE_ORG_LOGINCLIENT_PAT_EXPIRATIONDATE: "${LOGIN_CLIENT_PAT_EXPIRATION:-2099-01-01T00:00:00Z}",
        ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_REQUIRED: "true",
        ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI: "http://${ZITADEL_DOMAIN:-auth.localhost}/ui/v2/login/",
        ZITADEL_OIDC_DEFAULTLOGINURLV2: "http://${ZITADEL_DOMAIN:-auth.localhost}/ui/v2/login/login?authRequest=",
        ZITADEL_OIDC_DEFAULTLOGOUTURLV2: "http://${ZITADEL_DOMAIN:-auth.localhost}/ui/v2/login/logout?post_logout_redirect=",
      },
      volumes: ["zitadel-bootstrap:/zitadel/bootstrap:rw"],
      depends_on: {
        "zitadel-db": { condition: "service_healthy" },
        "zitadel-init": { condition: "service_completed_successfully" },
      },
    },
    "zitadel-api": {
      image: "ghcr.io/zitadel/zitadel:${ZITADEL_VERSION:-latest}",
      restart: "unless-stopped",
      command: "start",
      networks: ["proxy"],
      environment: {
        ZITADEL_MASTERKEY: "${ZITADEL_MASTERKEY:?required}",
        ZITADEL_PORT: "8080",
        ZITADEL_DATABASE_POSTGRES_DSN: "postgresql://${ZITADEL_DB_USER:-postgres}:${ZITADEL_DB_PASSWORD}@zitadel-db:5432/zitadel?sslmode=disable",
        ZITADEL_EXTERNALDOMAIN: "${ZITADEL_DOMAIN:-auth.localhost}",
        ZITADEL_EXTERNALPORT: "${ZITADEL_EXTERNALPORT:-80}",
        ZITADEL_EXTERNALSECURE: "${ZITADEL_EXTERNALSECURE:-false}",
        ZITADEL_TLS_ENABLED: "false",
        ZITADEL_CACHES_CONNECTORS_REDIS_ENABLED: "true",
        ZITADEL_CACHES_CONNECTORS_REDIS_URL: "redis://zitadel-redis:6379/0",
        ZITADEL_CACHES_INSTANCE_CONNECTOR: "redis",
        ZITADEL_CACHES_MILESTONES_CONNECTOR: "redis",
        ZITADEL_CACHES_ORGANIZATION_CONNECTOR: "redis",
      },
      volumes: ["zitadel-bootstrap:/zitadel/bootstrap:rw"],
      healthcheck: {
        test: ["CMD", "/app/zitadel", "ready"],
        interval: "10s",
        timeout: "30s",
        retries: 12,
        start_period: "30s",
      },
      depends_on: {
        "zitadel-db": { condition: "service_healthy" },
        "zitadel-redis": { condition: "service_healthy" },
        "zitadel-init": { condition: "service_completed_successfully" },
        "zitadel-setup": { condition: "service_completed_successfully" },
      },
    },
    "zitadel-login": {
      image: "ghcr.io/zitadel/zitadel-login:${ZITADEL_VERSION:-latest}",
      restart: "unless-stopped",
      networks: ["proxy"],
      environment: {
        ZITADEL_API_URL: "http://zitadel-api:8080",
        NEXT_PUBLIC_BASE_PATH: "/ui/v2/login",
        ZITADEL_SERVICE_USER_TOKEN_FILE: "/zitadel/bootstrap/login-client.pat",
        CUSTOM_REQUEST_HEADERS: "Host:${ZITADEL_DOMAIN:-auth.localhost}",
      },
      volumes: ["zitadel-bootstrap:/zitadel/bootstrap:ro"],
      healthcheck: {
        test: ["CMD", "/bin/sh", "-c", "node /app/healthcheck.mjs http://localhost:3000/ui/v2/login/healthy"],
        interval: "10s",
        timeout: "30s",
        retries: 12,
        start_period: "20s",
      },
      depends_on: {
        "zitadel-api": { condition: "service_healthy" },
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
