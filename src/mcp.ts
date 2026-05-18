import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { findProjectRoot, readProjectConfig } from "./utils/project.js"
import { buildProjectContext } from "./utils/context.js"

function buildContext(): string {
  const projectRoot = findProjectRoot()
  if (!projectRoot) {
    return [
      "⚠️  vrn.yaml not found in this directory or any parent directory.",
      "This project may not be a VRN project, or vrn.yaml was accidentally deleted.",
      "Run `bunx vrn doctor` to diagnose.",
    ].join("\n")
  }

  const config = readProjectConfig(projectRoot)
  return buildProjectContext(projectRoot, config)
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
        description: "Get the current VRN project state: apps, packages, auth mode, and exact file paths. Call this before making changes to any service, frontend, or package in the project.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === "get_context") {
      return {
        content: [{ type: "text", text: buildContext() }],
      }
    }
    throw new Error(`Unknown tool: ${req.params.name}`)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
