import { createFileRoute, redirect } from "@tanstack/react-router"
import { callbackFn } from "@/server/auth"

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async ({ search }) => {
    const { code, state } = search as { code?: string; state?: string }
    if (!code || !state) throw redirect({ href: "/login" })
    await callbackFn({ data: { code, state } })
  },
  component: () => null,
})
