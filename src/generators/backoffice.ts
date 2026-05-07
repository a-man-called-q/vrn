import { generateFrontend } from "./frontend.js"
import { TemplateData } from "../types.js"

export function generateBackoffice(
  targetDir: string,
  templatesDir: string,
  data: TemplateData
): void {
  generateFrontend(targetDir, templatesDir, data, {
    kind: "backoffice",
    prefix: "backoffice",
    defaultRoute: "/dashboard",
    authClientModule: data.authMode === "zitadel" ? "zitadel" : "api-client",
    loginSubtitle: "Sign in with your admin account",
    loginButton: "Continue to Login",
  })
}
