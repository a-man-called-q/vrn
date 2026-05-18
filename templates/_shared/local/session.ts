import { EncryptJWT, jwtDecrypt } from "jose"
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server"

const COOKIE_NAME = "session"

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters")
  }
  return new TextEncoder().encode(secret)
}

export interface Session {
  userId: string
  email: string
  name: string
  picture?: string
  token: string
}

export async function setSession(session: Session): Promise<void> {
  // NOTE: The full session (including the auth token) is encrypted and stored in
  // a httpOnly cookie.
  const jwt = await new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(getSecret())

  // sameSite: "lax" is intentional — it blocks cross-site form/XHR submissions while
  // allowing top-level navigations. Server functions use POST+JSON (not HTML forms), so
  // cross-site CSRF via a plain form is structurally impossible regardless.
  setCookie(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
}

export async function getSession(): Promise<Session | null> {
  const token = getCookie(COOKIE_NAME)
  if (!token) return null

  try {
    const { payload } = await jwtDecrypt(token, getSecret())
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function deleteSession(): Promise<void> {
  deleteCookie(COOKIE_NAME, { path: "/" })
}
