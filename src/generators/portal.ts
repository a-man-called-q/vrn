import { generateFrontend } from "./frontend.js"
import { ScaffoldData } from "../types.js"

/**
 * Generate the Portal frontend app: apps/portal-{name}/
 */
export function generatePortal(
  targetDir: string,
  templatesDir: string,
  data: ScaffoldData
): void {
  generateFrontend(targetDir, templatesDir, data, {
    kind: "portal",
    prefix: "portal",
    defaultRoute: "/",
    authClientModule: "api-client",
    loginSubtitle: "Sign in to your account",
    loginButton: "Continue with SSO",
  })
}
