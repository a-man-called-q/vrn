import { createApiClient } from "@workspace/{{dashCase name}}-service-client"

const api = createApiClient(process.env.API_URL!)

// ─── Auth ────────────────────────────────────────────────────────────

export async function initAuth(redirectUri: string) {
  const { data, error } = await api.auth.init.get({ query: { redirectUri } })
  if (error) throw new Error(`Auth init failed: ${(error.value as any)?.message ?? 'Unknown error'}`)
  return data
}

export async function exchangeToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
) {
  const { data, error } = await api.auth.exchange.post({ code, codeVerifier, redirectUri })
  if (error) throw new Error(`Token exchange failed: ${(error.value as any)?.message ?? 'Unknown error'}`)
  return data
}

export async function getLogoutUrl(
  idToken: string,
  redirectUri: string,
) {
  const { data, error } = await api.auth.logout.post({ idToken, redirectUri })
  if (error) throw new Error(`Logout failed: ${(error.value as any)?.message ?? 'Unknown error'}`)
  return data
}

// ─── Users ───────────────────────────────────────────────────────────

export async function getUserCount(): Promise<number> {
  const { data, error } = await api.admin.users.count.get()
  if (error) throw new Error(`Failed to fetch user count: ${(error.value as any)?.message ?? 'Unknown error'}`)
  return data?.count ?? 0
}

export async function getActiveSessionCount(): Promise<number | null> {
  const { data } = await api.admin.sessions.count.get()
  return data?.count ?? null
}

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  state: string
  createdAt: string
  roles: string[]
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await api.admin.users.get()
  if (error) throw new Error(`Failed to fetch users: ${(error.value as any)?.message ?? 'Unknown error'}`)
  const users = (data as any).users ?? []
  return users.map((u: any) => {
    const profile = u.human?.profile
    const displayName =
      (profile?.displayName ?? [profile?.firstName, profile?.lastName].filter(Boolean).join(" "))
      || u.userName
      || "—"
    return {
      id: u.id,
      name: displayName,
      email: u.human?.email?.email ?? "—",
      emailVerified: u.human?.email?.isEmailVerified ?? false,
      state: u.state ?? "USER_STATE_ACTIVE",
      createdAt: u.details?.creationDate ?? "",
      roles: u.roles ?? [],
    }
  })
}

export async function createUser(data: {
  firstName: string
  lastName: string
  email: string
  username: string
  initialPassword: string
}): Promise<{ userId: string }> {
  const { data: result, error } = await api.admin.users.post(data as any)
  if (error) throw new Error((error.value as any)?.message ?? "Failed to create user")
  return result as any
}

// ─── Roles ───────────────────────────────────────────────────────────

export interface Role {
  key: string
  displayName: string
  group?: string
  createdAt: string
}

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await api.admin.roles.get()
  if (error) throw new Error((error.value as any)?.message ?? "Failed to fetch roles")
  const roles = (data as any).roles ?? []
  return roles.map((r: any) => ({
    key: r.key,
    displayName: r.displayName ?? r.key,
    group: r.group,
    createdAt: r.creationDate ?? "",
  }))
}

export async function createRoleApi(data: { key: string; displayName: string; group?: string }): Promise<void> {
  const { error } = await api.admin.roles.post(data as any)
  if (error) throw new Error((error.value as any)?.message ?? "Failed to create role")
}

export async function deleteRoleApi(key: string): Promise<void> {
  const { error } = await api.admin.roles({ key }).delete()
  if (error) throw new Error(`Failed to delete role: ${(error.value as any)?.message ?? 'Unknown error'}`)
}
