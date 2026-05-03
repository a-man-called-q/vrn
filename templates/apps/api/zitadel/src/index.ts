import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { setupConsumer, redis } from "./stream"

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

// Start Redis Consumer in the background
setupConsumer().catch(console.error);

const app = new Elysia()
  .use(
    cors({
      origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
      credentials: true,
    }),
  )
  .get("/health", () => ({ status: "ok" }))
  .get("/", () => "Hello from {{titleCase name}} API")

  // Zitadel Webhook Broadcaster Endpoint
  .post("/webhooks/zitadel", async ({ body }) => {
    const { zitadelId, email, name } = body as any;

    if (!zitadelId || !email) {
      return new Response("Missing required identity fields", { status: 400 });
    }

    await redis.xadd(
      'str:zitadel:events', '*',
      'type', 'user.registered',
      'payload', JSON.stringify({ zitadelId, email, name })
    );

    return { success: true, message: "Identity event broadcasted" };
  })

export type App = typeof app

app.listen(process.env.PORT ?? {{apiPort}})

console.log(`🦊 {{titleCase name}} API is running at ${app.server?.hostname}:${app.server?.port}`)
