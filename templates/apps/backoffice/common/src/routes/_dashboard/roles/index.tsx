import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { getRolesFn, deleteRoleFn } from "@/server/roles"
import type { Role } from "@/lib/auth/zitadel"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { DataTable, type ColumnDef } from "@workspace/ui/components/data-table"
import { EllipsisVerticalIcon, PlusIcon } from "lucide-react"

export const Route = createFileRoute("/_dashboard/roles/")({
  loader: async () => getRolesFn(),
  component: RolesPage,
})

function createColumns(onDelete: (key: string) => void): ColumnDef<Role>[] {
  return [
    {
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.key}
        </Badge>
      ),
    },
    {
      accessorKey: "displayName",
      header: "Display Name",
      cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
    },
    {
      accessorKey: "group",
      header: "Group",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.group ?? "—"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "—",
    },
    {
      id: "actions",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground data-open:bg-muted"
              />
            }
          >
            <EllipsisVerticalIcon className="size-4" />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(row.original.key)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

function RolesPage() {
  const router = useRouter()
  const roles = Route.useLoaderData()

  async function handleDelete(key: string) {
    try {
      await deleteRoleFn({ data: { key } })
      toast.success(`Role "${key}" deleted.`)
      router.invalidate()
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to delete role.")
    }
  }

  const columns = React.useMemo(() => createColumns(handleDelete), [])

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <Card className="bg-primary/40 border-primary/20">
        <CardContent className="flex items-center justify-end px-4 py-2">
          <Button size="sm" variant="outline" onClick={() => window.location.href = "/roles/new"}>
            <PlusIcon className="size-4" />
            Create Role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={roles} />
        </CardContent>
      </Card>
    </div>
  )
}
