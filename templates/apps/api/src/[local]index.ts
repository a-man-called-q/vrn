import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { auth } from "./lib/auth"

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const app = new Elysia()
  .use(
    cors({
      origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
      credentials: true,
    }),
  )
  .get("/health", () => ({ status: "ok" }))
  .get("/", () => "Hello from {{titleCase name}} API")
  // TODO: Implement rate limiting for authentication endpoints in production
  .all("/api/auth/*", ({ request }) => auth.handler(request))

export type App = typeof app

app.listen(process.env.PORT ?? {{apiPort}})

console.log(`🦊 {{titleCase name}} API is running at ${app.server?.hostname}:${app.server?.port}`)
