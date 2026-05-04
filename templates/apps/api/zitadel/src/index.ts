import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { setupConsumer, redis } from "./stream"
import { createHmac, timingSafeEqual } from "node:crypto"

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
  .post("/webhooks/zitadel", async ({ body, headers }) => {
    // Verify HMAC-SHA256 signature from Zitadel
    const secret = process.env.ZITADEL_WEBHOOK_SECRET
    const signature = headers["x-zitadel-signature"]
    if (!secret || !signature) {
      return new Response("Unauthorized", { status: 401 })
    }
    const expected = createHmac("sha256", secret)
      .update(JSON.stringify(body))
      .digest("hex")
    const expectedBuf = Buffer.from(expected)
    const signatureBuf = Buffer.from(signature)
    if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { zitadelId, email, name } = body

    await redis.xadd(
      'str:zitadel:events', '*',
      'type', 'user.registered',
      'payload', JSON.stringify({ zitadelId, email, name })
    );

    return { success: true, message: "Identity event broadcasted" };
  }, {
    body: t.Object({
      zitadelId: t.String(),
      email: t.String({ format: "email" }),
      name: t.Optional(t.String()),
    })
  })

export type App = typeof app

app.listen(process.env.PORT ?? {{apiPort}})

console.log(`🦊 {{titleCase name}} API is running at ${app.server?.hostname}:${app.server?.port}`)
