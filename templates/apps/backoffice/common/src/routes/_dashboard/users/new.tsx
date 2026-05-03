import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { createUserFn } from "@/server/users"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const Route = createFileRoute("/_dashboard/users/new")({
  component: CreateUserPage,
})

function CreateUserPage() {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    initialPassword: "",
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    try {
      await createUserFn({ data: form })
      toast.success("User created successfully.")
      router.navigate({ to: "/users" })
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to create user.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>
            User will need to change their password on first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" value={form.firstName} onChange={set("firstName")} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" value={form.lastName} onChange={set("lastName")} required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={set("email")} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="johndoe" value={form.username} onChange={set("username")} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="initialPassword">Initial Password</Label>
              <Input id="initialPassword" type="password" placeholder="Temporary password" value={form.initialPassword} onChange={set("initialPassword")} required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
