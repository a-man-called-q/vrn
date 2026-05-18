import { Elysia } from "elysia"
import { auth } from "../lib/auth.js"

async function requireAdmin({ request, set }: { request: Request; set: { status: number } }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    set.status = 401
    return { error: "Unauthorized" }
  }
  if ((session.user as { role?: string }).role !== "admin") {
    set.status = 403
    return { error: "Forbidden" }
  }
}

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .guard({ beforeHandle: requireAdmin as any }, (app) =>
    app
      .get("/users", async ({ request }) => {
        const res = await auth.api.listUsers({
          query: { limit: 100, offset: 0 },
          headers: request.headers,
        })
        return { users: (res as any).users ?? [] }
      })
      .post("/users", async ({ body, request }) => {
        const res = await auth.api.createUser({
          body: body as any,
          headers: request.headers,
        })
        return { userId: (res as any).user?.id }
      })
  )
