import { SignJWT, jwtVerify } from "jose"
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
  const jwt = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())

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
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function deleteSession(): Promise<void> {
  deleteCookie(COOKIE_NAME, { path: "/" })
}
