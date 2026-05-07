import { createServerFn } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { getSession, setSession, deleteSession, type Session } from "@/lib/auth/session"

export type { Session }

const API_URL = process.env.API_URL!

export const getSessionFn = createServerFn().handler(
  async (): Promise<Session | null> => getSession()
)

export const loginFn = createServerFn()
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>
    if (typeof d?.email !== "string" || typeof d?.password !== "string") {
      throw new Error("Invalid login parameters")
    }
    return { email: d.email, password: d.password }
  })
  .handler(async ({ data }) => {
    const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    })
    if (!res.ok) throw new Error("Invalid credentials")
    const { user, token } = await res.json()
    await setSession({
      userId: user.id,
      email: user.email,
      name: user.name ?? user.email,
      picture: user.image ?? undefined,
      token,
    })
    throw redirect({ href: "{{defaultRoute}}" })
  })

export const logoutFn = createServerFn().handler(async () => {
  await deleteSession()
  throw redirect({ href: "/login" })
})
