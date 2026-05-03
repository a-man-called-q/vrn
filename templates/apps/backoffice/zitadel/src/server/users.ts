import { createServerFn } from "@tanstack/react-start"
import { getUserCount, getActiveSessionCount, getUsers, createUser } from "@/lib/auth/zitadel"

export const getUsersPageDataFn = createServerFn().handler(async () => {
  const [userCount, activeCount, users] = await Promise.all([
    getUserCount(),
    getActiveSessionCount(),
    getUsers(),
  ])
  return { userCount, activeCount, users }
})

export const createUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { firstName: string; lastName: string; email: string; username: string; initialPassword: string })
  .handler(async ({ data }) => {
    return createUser(data)
  })
