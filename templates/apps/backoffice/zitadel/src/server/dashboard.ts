import { createServerFn } from "@tanstack/react-start"
import { getUserCount } from "@/lib/auth/zitadel"

const ZITADEL_PUBLIC_URL = process.env.ZITADEL_PUBLIC_URL ?? "https://auth.localhost"

export const getDashboardDataFn = createServerFn().handler(async () => {
  const userCount = await getUserCount()
  return {
    userCount,
    zitadelConsoleUrl: `${ZITADEL_PUBLIC_URL}/ui/console`,
  }
})
