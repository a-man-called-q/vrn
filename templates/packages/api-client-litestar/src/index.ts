export interface HealthResponse {
  status: string
}

export interface UserResponse {
  id: number
  email: string
  name: string | null
}

export interface AuthResponse {
  token: string
  user: UserResponse
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`[{{dashCase name}}-service] ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export function createApiClient(baseUrl: string) {
  const json = (body: unknown) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const bearer = (token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  })

  return {
    health: {
      get: () => request<HealthResponse>(`${baseUrl}/health`),
    },
    auth: {
      register: (email: string, password: string, name?: string) =>
        request<AuthResponse>(`${baseUrl}/auth/register`, json({ email, password, name })),
      login: (email: string, password: string) =>
        request<AuthResponse>(`${baseUrl}/auth/login`, json({ email, password })),
      me: (token: string) =>
        request<UserResponse>(`${baseUrl}/auth/me`, bearer(token)),
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
