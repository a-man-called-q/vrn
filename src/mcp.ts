import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { findProjectRoot, readProjectConfig } from "./utils/project.js"
import { buildProjectContext } from "./utils/context.js"
import { runGen, type AppType } from "./actions/gen.js"
import { linkServices } from "./actions/link.js"
import { runInstallQuiet } from "./utils/pm.js"
import { SKILLS } from "./commands/skill/content.js"

function getProjectRoot() {
  const root = findProjectRoot()
  if (!root) throw new Error("vrn.yaml not found. Run this from inside a vrn project.")
  return root
}

export async function runMcp(): Promise<void> {
  const server = new Server(
    { name: "vrn", version: "1.0.0" },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_context",
        description: "Get the current VRN project state: apps, packages, auth mode, and file paths. ALWAYS call this first before any task — it also lists available skills.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_skill",
        description: "Get step-by-step instructions for a task. Available skills: " + Object.keys(SKILLS).join(", "),
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Skill name. One of: " + Object.keys(SKILLS).join(", "),
              enum: Object.keys(SKILLS),
            },
          },
          required: ["name"],
        },
      },
      {
        name: "link_apps",
        description: "Wire two services together: updates vrn.yaml and adds the typed client package as a dependency. ALWAYS call this instead of editing package.json manually.",
        inputSchema: {
          type: "object",
          properties: {
            source: { type: "string", description: "Service name that will call the target (e.g. portal)." },
            target: { type: "string", description: "Service name that will be called (e.g. auth)." },
          },
          required: ["source", "target"],
        },
      },
      {
        name: "gen_app",
        description: "Scaffold a new app (service, portal, or backoffice) into the project. Runs file generation, docker-compose regeneration, and package install. ALWAYS call this before creating any new app — never create files in apps/ or packages/ manually.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["service", "portal", "backoffice"],
              description: "App type to scaffold.",
            },
            name: {
              type: "string",
              description: "App name, lowercase with hyphens (e.g. auth, payments).",
            },
            framework: {
              type: "string",
              enum: ["elysia", "litestar"],
              description: "Service framework. Only for type=service. Defaults to elysia.",
            },
            port: {
              type: "string",
              description: "Port number. Defaults: service=4001, portal=3001, backoffice=5175.",
            },
            links: {
              type: "array",
              items: { type: "string" },
              description: "Names of registered services this app should connect to. Optional — unknown names are silently skipped.",
            },
          },
          required: ["type", "name"],
        },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params

    if (name === "get_context") {
      try {
        const root = getProjectRoot()
        const config = readProjectConfig(root)
        return { content: [{ type: "text", text: buildProjectContext(root, config) }] }
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true }
      }
    }

    if (name === "get_skill") {
      const skillName = (args as { name: string }).name
      const text = SKILLS[skillName]
      if (!text) return { content: [{ type: "text", text: `Unknown skill: ${skillName}` }], isError: true }
      return { content: [{ type: "text", text }] }
    }

    if (name === "link_apps") {
      const { source, target } = args as { source: string; target: string }
      try {
        const root = getProjectRoot()
        const config = readProjectConfig(root)
        const result = linkServices(root, config, source, target)
        if (!result.ok) {
          const messages = {
            "self-link": "source and target must be different services",
            "already-linked": `${source} is already linked to ${target}`,
            "source-not-found": `service "${source}" not found in vrn.yaml`,
            "target-not-found": `service "${target}" not found in vrn.yaml`,
          }
          return { content: [{ type: "text", text: messages[result.reason] }], isError: true }
        }
        if (result.addedDep) {
          runInstallQuiet(root, config.packageManagers.js.name)
        }
        return { content: [{ type: "text", text: `linked — ${source} → ${target}` }] }
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true }
      }
    }

    if (name === "gen_app") {
      const a = args as { type: string; name: string; framework?: string; port?: string; links?: string[] }
      try {
        const root = getProjectRoot()
        const config = readProjectConfig(root)
        const app = runGen(
          {
            type: a.type as AppType,
            name: a.name,
            framework: a.framework as "elysia" | "litestar" | undefined,
            port: a.port,
            links: a.links,
          },
          root,
          config,
        )
        return { content: [{ type: "text", text: `done — ${app.dirName}` }] }
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true }
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
