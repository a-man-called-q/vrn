import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { createRoleFn } from "@/server/roles"
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

export const Route = createFileRoute("/_dashboard/roles/new")({
  component: CreateRolePage,
})

function CreateRolePage() {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)
  const [form, setForm] = React.useState({ key: "", displayName: "", group: "" })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    try {
      await createRoleFn({
        data: {
          key: form.key,
          displayName: form.displayName,
          ...(form.group ? { group: form.group } : {}),
        },
      })
      toast.success(`Role "${form.key}" created.`)
      router.navigate({ to: "/roles" })
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to create role.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Create Role</CardTitle>
          <CardDescription>
            Define a new role for your Zitadel project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="key">Role Key</Label>
              <Input
                id="key"
                placeholder="e.g. admin, viewer, editor"
                value={form.key}
                onChange={set("key")}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="e.g. Administrator"
                value={form.displayName}
                onChange={set("displayName")}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="group">
                Group <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="group"
                placeholder="e.g. platform"
                value={form.group}
                onChange={set("group")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating..." : "Create Role"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
