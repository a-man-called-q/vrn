import { createServerFn } from "@tanstack/react-start"
import { getRoles, createRoleApi, deleteRoleApi } from "@/lib/auth/zitadel"

export const getRolesFn = createServerFn().handler(async () => {
  return getRoles()
})

export const createRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { key: string; displayName: string; group?: string })
  .handler(async ({ data }) => {
    await createRoleApi(data)
  })

export const deleteRoleFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { key: string })
  .handler(async ({ data }) => {
    await deleteRoleApi(data.key)
  })
