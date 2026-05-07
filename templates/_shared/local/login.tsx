import { createFileRoute, redirect } from "@tanstack/react-router"
import { useState } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { loginFn } from "@/server/auth"
import { callWithRedirect } from "@/lib/server-redirect"

export const Route = createFileRoute("/_auth/login")({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ href: "{{defaultRoute}}" })
  },
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Acme Inc.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs flex flex-col gap-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-sm text-balance text-muted-foreground">{{loginSubtitle}}</p>
            </div>
            <form
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                try {
                  await callWithRedirect(() => loginFn({ data: { email, password } }))
                } catch {
                  setError("Invalid email or password")
                }
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block" />
    </div>
  )
}
