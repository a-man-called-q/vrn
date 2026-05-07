import { createServerFn } from "@tanstack/react-start"
import { getUserCount } from "@/lib/auth/admin"

export const getDashboardDataFn = createServerFn().handler(async () => {
  const userCount = await getUserCount()
  return { userCount }
})
