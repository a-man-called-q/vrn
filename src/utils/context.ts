import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { ProjectConfig } from "../types.js"

export function buildProjectContext(projectRoot: string, config: ProjectConfig): string {
  const authMode = config.useZitadel ? "zitadel" : "local"
  const multiTenant = config.multiTenant ?? false

  const lines: string[] = [
    `# VRN Project: ${config.name}`,
    ``,
    `auth: ${authMode}`,
    `multiTenant: ${multiTenant}`,
    `packageManager: ${config.packageManager}`,
    ``,
  ]

  lines.push(`## Apps (${config.apps.length})`)
  if (config.apps.length === 0) {
    lines.push(`(none — run \`bunx vrn gen\` to add apps)`)
  } else {
    for (const app of config.apps) {
      const fw = app.serviceFramework ? `/${app.serviceFramework}` : ""
      const links = app.links?.length
        ? `  links→ ${app.links.map(l => `@workspace/${l}-service-client`).join(", ")}`
        : ""
      lines.push(`- ${app.dirName}  [${app.type}${fw}]  port ${app.port}${links}`)
    }
  }

  const pkgsDir = join(projectRoot, "packages")
  if (existsSync(pkgsDir)) {
    const pkgs = readdirSync(pkgsDir).filter(p => !p.startsWith("."))
    if (pkgs.length) {
      lines.push(``, `## Packages`)
      for (const p of pkgs) lines.push(`- @workspace/${p}`)
    }
  }

  lines.push(``, `## Paths`)

  const elysiaApps = config.apps.filter(a => a.serviceFramework === "elysia")
  const litestarApps = config.apps.filter(a => a.serviceFramework === "litestar")
  const frontendApps = config.apps.filter(a => a.type === "portal" || a.type === "backoffice")

  for (const app of elysiaApps) {
    lines.push(
      ``,
      `### ${app.dirName} (elysia, auth: ${authMode})`,
      `- routes dir:  apps/${app.dirName}/src/routes/`,
      `- entry:       apps/${app.dirName}/src/index.ts`,
      `- db schema:   packages/db-${app.name}/src/schema.ts`,
      `- auth lib:    apps/${app.dirName}/src/lib/auth.ts`,
    )
  }

  for (const app of litestarApps) {
    lines.push(
      ``,
      `### ${app.dirName} (litestar, auth: ${authMode})`,
      `- routes dir:  apps/${app.dirName}/src/routes/`,
      `- entry:       apps/${app.dirName}/src/main.py`,
      `- models dir:  apps/${app.dirName}/src/models/`,
      `- auth:        apps/${app.dirName}/src/auth.py`,
    )
  }

  for (const app of frontendApps) {
    const client = app.apiSource ? `@workspace/${app.apiSource}-service-client` : null
    lines.push(
      ``,
      `### ${app.dirName} (${app.type})`,
      `- pages dir:   apps/${app.dirName}/src/routes/`,
      ...(client ? [`- api client:  ${client}`] : []),
    )
  }

  if (config.apps.some(a => a.links?.length)) {
    lines.push(``, `## Service links`)
    for (const app of config.apps.filter(a => a.links?.length)) {
      for (const target of app.links!) {
        lines.push(`- ${app.dirName} → @workspace/${target}-service-client`)
      }
    }
  }

  return lines.join("\n")
}
