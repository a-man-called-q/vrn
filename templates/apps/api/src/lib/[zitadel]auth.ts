import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { genericOAuth } from "better-auth/plugins"
import { db } from "@workspace/db-{{dashCase name}}"

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  trustedOrigins: ALLOWED_ORIGINS,
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "zitadel",
          discoveryUrl: `${process.env.ZITADEL_ISSUER}/.well-known/openid-configuration`,
          clientId: process.env.ZITADEL_CLIENT_ID!,
          clientSecret: process.env.ZITADEL_CLIENT_SECRET!,
          scopes: ["openid", "email", "profile"],
          pkce: true,
        },
      ],
    }),
  ],
})
