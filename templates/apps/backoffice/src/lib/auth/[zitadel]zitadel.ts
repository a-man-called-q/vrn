import { createApiClient } from "@workspace/{{dashCase apiSource}}-service-client"

const api = createApiClient(process.env.API_URL!)

function getErrMsg(error: unknown, fallback: string): string {
  return (error as { value?: { message?: string } })?.value?.message ?? fallback
}

// ─── Auth ────────────────────────────────────────────────────────────

export async function initAuth(redirectUri: string) {
  const { data, error } = await api.auth.init.get({ query: { redirectUri } })
  if (error) throw new Error(`Auth init failed: ${getErrMsg(error, "Unknown error")}`)
  return data
}

export async function exchangeToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
) {
  const { data, error } = await api.auth.exchange.post({ code, codeVerifier, redirectUri })
  if (error) throw new Error(`Token exchange failed: ${getErrMsg(error, "Unknown error")}`)
  return data
}

export async function getLogoutUrl(
  idToken: string,
  redirectUri: string,
) {
  const { data, error } = await api.auth.logout.post({ idToken, redirectUri })
  if (error) throw new Error(`Logout failed: ${getErrMsg(error, "Unknown error")}`)
  return data
}

// ─── Users ───────────────────────────────────────────────────────────

export async function getUserCount(): Promise<number> {
  const { data, error } = await api.admin.users.count.get()
  if (error) throw new Error(`Failed to fetch user count: ${getErrMsg(error, "Unknown error")}`)
  return (data as { count?: number })?.count ?? 0
}

export async function getActiveSessionCount(): Promise<number | null> {
  const { data } = await api.admin.sessions.count.get()
  return (data as { count?: number })?.count ?? null
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
  if (error) throw new Error(`Failed to fetch users: ${getErrMsg(error, "Unknown error")}`)
  const users = (data as { users?: Record<string, unknown>[] }).users ?? []
  return users.map((u) => {
    const profile = (u.human as { profile?: Record<string, string> })?.profile
    const displayName =
      (profile?.displayName ?? [profile?.firstName, profile?.lastName].filter(Boolean).join(" "))
      || String(u.userName ?? "—")
    return {
      id: String(u.id ?? ""),
      name: displayName,
      email: String((u.human as { email?: { email?: string } })?.email?.email ?? "—"),
      emailVerified: Boolean((u.human as { email?: { isEmailVerified?: boolean } })?.email?.isEmailVerified),
      state: String(u.state ?? "USER_STATE_ACTIVE"),
      createdAt: String((u.details as { creationDate?: string })?.creationDate ?? ""),
      roles: Array.isArray(u.roles) ? u.roles.map(String) : [],
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
  const { data: result, error } = await api.admin.users.post(data as never)
  if (error) throw new Error(getErrMsg(error, "Failed to create user"))
  return result as { userId: string }
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
  if (error) throw new Error(getErrMsg(error, "Failed to fetch roles"))
  const roles = (data as { roles?: Record<string, unknown>[] }).roles ?? []
  return roles.map((r) => ({
    key: String(r.key ?? ""),
    displayName: String(r.displayName ?? r.key ?? ""),
    group: r.group ? String(r.group) : undefined,
    createdAt: String(r.creationDate ?? ""),
  }))
}

export async function createRoleApi(data: { key: string; displayName: string; group?: string }): Promise<void> {
  const { error } = await api.admin.roles.post(data as never)
  if (error) throw new Error(getErrMsg(error, "Failed to create role"))
}

export async function deleteRoleApi(key: string): Promise<void> {
  const { error } = await api.admin.roles({ key }).delete()
  if (error) throw new Error(`Failed to delete role: ${getErrMsg(error, "Unknown error")}`)
}
