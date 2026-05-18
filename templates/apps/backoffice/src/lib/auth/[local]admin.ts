import { createApiClient } from "@workspace/{{dashCase apiSource}}-service-client"

const api = createApiClient(process.env.API_URL!)

function getErrMsg(error: unknown, fallback: string): string {
  return (error as { value?: { message?: string } })?.value?.message ?? fallback
}

// ─── Users ───────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: string
  roles: string[]
}

export async function getUserCount(): Promise<number> {
  const users = await getUsers()
  return users.length
}

export async function getActiveSessionCount(): Promise<number | null> {
  return null
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await api.admin.users.get()
  if (error) throw new Error(`Failed to fetch users: ${getErrMsg(error, "Unknown error")}`)
  const users = (data as { users?: Record<string, unknown>[] }).users ?? []
  return users.map((u) => ({
    id: String(u.id ?? ""),
    name: String(u.name ?? u.email ?? ""),
    email: String(u.email ?? ""),
    emailVerified: Boolean(u.emailVerified),
    createdAt: String(u.createdAt ?? ""),
    roles: u.role ? [String(u.role)] : [],
  }))
}

export async function createUser(data: {
  name: string
  email: string
  password: string
}): Promise<{ userId: string }> {
  const { data: result, error } = await api.admin.users.post(data as never)
  if (error) throw new Error(getErrMsg(error, "Failed to create user"))
  return result as { userId: string }
}

// ─── Roles ───────────────────────────────────────────────────────────
// Local auth does not have project-level roles like Zitadel.
// Roles are stored as a field on the user via the admin plugin.

export interface Role {
  key: string
  displayName: string
  group?: string
  createdAt: string
}

export async function getRoles(): Promise<Role[]> {
  return []
}

export async function createRoleApi(_data: { key: string; displayName: string; group?: string }): Promise<void> {
  throw new Error("Role management requires an admin plugin to be configured in the API.")
}

export async function deleteRoleApi(_key: string): Promise<void> {
  throw new Error("Role management requires an admin plugin to be configured in the API.")
}
