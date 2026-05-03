import { createApiClient } from "@workspace/api-client-{{dashCase name}}"

const api = createApiClient(process.env.API_URL!)

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
