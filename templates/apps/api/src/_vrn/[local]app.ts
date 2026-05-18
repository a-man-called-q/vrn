import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { rateLimit } from "@elysiajs/rate-limit"
import { auth } from "../lib/auth"
import { adminRoutes } from "../routes/admin"
{{#if subscription}}
import { billingRoutes } from "../routes/billing"
{{/if}}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const rateLimitedAuth = new Elysia()
  .use(rateLimit({
    duration: 60 * 1000,
    max: 20,
    errorResponse: new Response(
      JSON.stringify({ error: "Too many requests, please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    ),
  }))
  .all("/api/auth/*", ({ request }) => auth.handler(request))

export const vrnApp = new Elysia()
  .use(cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
    credentials: true,
  }))
  .get("/health", () => ({ status: "ok" }))
  .get("/", () => "Hello from {{titleCase name}} API")
  .use(rateLimitedAuth)
  .use(adminRoutes)
{{#if subscription}}
  .use(billingRoutes)
{{/if}}
