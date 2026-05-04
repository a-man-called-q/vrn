import { generateFrontend } from "./frontend.js"
import { ScaffoldData } from "../types.js"

/**
 * Generate the Backoffice admin app: apps/backoffice-{name}/
 */
export function generateBackoffice(
  targetDir: string,
  templatesDir: string,
  data: ScaffoldData
): void {
  generateFrontend(targetDir, templatesDir, data, {
    kind: "backoffice",
    prefix: "backoffice",
    defaultRoute: "/dashboard",
    authClientModule: data.authProvider === "zitadel" ? "zitadel" : "api-client",
    loginSubtitle: "Sign in with your admin account",
    loginButton: "Continue to Login",
  })
}
