import { generateFrontend } from "./frontend.js"
import { TemplateData } from "../types.js"

export function generatePortal(
  targetDir: string,
  templatesDir: string,
  data: TemplateData
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
