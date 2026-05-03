import { createApiClient } from "@workspace/{{dashCase name}}-service-client"

const api = createApiClient(process.env.API_URL!)

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
  if (error) throw new Error(`Failed to fetch users: ${(error.value as any)?.message ?? 'Unknown error'}`)
  const users = (data as any).users ?? []
  return users.map((u: any) => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    emailVerified: u.emailVerified ?? false,
    createdAt: u.createdAt ?? "",
    roles: u.role ? [u.role] : [],
  }))
}

export async function createUser(data: {
  name: string
  email: string
  password: string
}): Promise<{ userId: string }> {
  const { data: result, error } = await api.admin.users.post(data as any)
  if (error) throw new Error((error.value as any)?.message ?? "Failed to create user")
  return result as any
}

// ─── Roles ───────────────────────────────────────────────────────────
// Better Auth does not have project-level roles like Zitadel.
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
  throw new Error("Role management requires the Better Auth admin plugin to be configured in the API.")
}

export async function deleteRoleApi(_key: string): Promise<void> {
  throw new Error("Role management requires the Better Auth admin plugin to be configured in the API.")
}
