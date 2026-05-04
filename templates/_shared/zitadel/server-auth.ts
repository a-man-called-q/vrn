import { createServerFn } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server"
import { initAuth, exchangeToken, getLogoutUrl } from "@/lib/auth/{{authClientModule}}"
import {
  getSession,
  setSession,
  deleteSession,
  type Session,
} from "@/lib/auth/session"

export type { Session }

const REDIRECT_URI = process.env.REDIRECT_URI!
const POST_LOGOUT_URI = process.env.POST_LOGOUT_URI ?? "/login"

export const getSessionFn = createServerFn().handler(
  async (): Promise<Session | null> => getSession()
)

export const loginFn = createServerFn().handler(async () => {
  const { authUrl, state, codeVerifier } = await initAuth(REDIRECT_URI)
  if (!authUrl || !state || !codeVerifier) throw new Error("Invalid init response")

  const cookieOpts = { httpOnly: true, maxAge: 600, path: "/" } as const
  setCookie("oauth_state", state, cookieOpts)
  setCookie("code_verifier", codeVerifier, cookieOpts)

  throw redirect({ href: authUrl })
})

export const callbackFn = createServerFn()
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>
    if (typeof d?.code !== "string" || typeof d?.state !== "string") {
      throw new Error("Invalid callback parameters")
    }
    return { code: d.code, state: d.state }
  })
  .handler(async ({ data }) => {
    const storedState = getCookie("oauth_state")
    const codeVerifier = getCookie("code_verifier")

    deleteCookie("oauth_state", { path: "/" })
    deleteCookie("code_verifier", { path: "/" })

    if (!storedState || !codeVerifier || storedState !== data.state) {
      throw redirect({ href: "/login" })
    }

    try {
      const { user, idToken } = await exchangeToken(data.code, codeVerifier, REDIRECT_URI)
      if (!user || !idToken) throw new Error("Missing response data")

      await setSession({
        userId: user.sub as string,
        email: user.email as string,
        name: user.name as string,
        picture: user.picture as string,
        idToken,
      })
    } catch {
      throw redirect({ href: "/login" })
    }

    throw redirect({ href: "{{defaultRoute}}" })
  })

export const logoutFn = createServerFn().handler(async () => {
  const session = await getSession()
  const idToken = session?.idToken

  await deleteSession()

  if (idToken) {
    const { logoutUrl } = await getLogoutUrl(idToken, POST_LOGOUT_URI)
    throw redirect({ href: logoutUrl })
  }

  throw redirect({ href: "/login" })
})
