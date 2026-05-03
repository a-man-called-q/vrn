import { treaty } from "@elysiajs/eden"
import type { App } from "api/index"

/**
 * Create a type-safe API client using Eden Treaty.
 *
 * @param baseUrl - The base URL of the Elysia API server
 */
export function createApiClient(baseUrl: string) {
  return treaty<App>(baseUrl)
}

export type ApiClient = ReturnType<typeof createApiClient>
