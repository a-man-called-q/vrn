import { createServerFn } from "@tanstack/react-start"
import { getUserCount, getActiveSessionCount, getUsers, createUser } from "@/lib/auth/admin"

export const getUsersPageDataFn = createServerFn().handler(async () => {
  const [userCount, activeCount, users] = await Promise.all([
    getUserCount(),
    getActiveSessionCount(),
    getUsers(),
  ])
  return { userCount, activeCount, users }
})

export const createUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { name: string; email: string; password: string })
  .handler(async ({ data }) => {
    return createUser(data)
  })
