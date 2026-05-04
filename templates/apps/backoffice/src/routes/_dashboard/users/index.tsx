import { createFileRoute } from "@tanstack/react-router"
import { getUsersPageDataFn } from "@/server/users"
import type { User } from "@/lib/auth/zitadel"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { DataTable, type ColumnDef } from "@workspace/ui/components/data-table"
import { EllipsisVerticalIcon, PlusIcon } from "lucide-react"

export const Route = createFileRoute("/_dashboard/users/")({
  loader: async () => getUsersPageDataFn(),
  component: UsersPage,
})

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.email}</span>
        {row.original.emailVerified && (
          <Badge className="text-xs bg-transparent text-green-700 border-green-600/50 dark:text-green-400 dark:border-green-500/50">
            Verified
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "state",
    header: "Status",
    meta: {
      filterElement: ({ column }) => (
        <Select
          value={(column.getFilterValue() as string) ?? "all"}
          onValueChange={(val) => column.setFilterValue(val === "all" ? undefined : val)}
        >
          <SelectTrigger className="h-7 text-xs font-normal">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="USER_STATE_ACTIVE">Active</SelectItem>
            <SelectItem value="USER_STATE_INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    cell: ({ row }) => (
      <Badge variant={row.original.state === "USER_STATE_ACTIVE" ? "default" : "secondary"}>
        {row.original.state === "USER_STATE_ACTIVE" ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "roles",
    header: "Roles",
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => {
      const roles = row.original.roles
      if (!roles || roles.length === 0) {
        return <span className="text-muted-foreground text-xs">—</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge
              key={role}
              variant="outline"
              className="text-[10px] font-semibold tracking-wider uppercase"
            >
              {role.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) =>
      row.original.createdAt
        ? new Date(row.original.createdAt).toLocaleDateString()
        : "—",
  },
  {
    id: "actions",
    enableSorting: false,
    enableColumnFilter: false,
    cell: () => (
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
          <DropdownMenuItem>View</DropdownMenuItem>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function UsersPage() {
  const { userCount, activeCount, users } = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {userCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            All registered users
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Active Now</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {activeCount?.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            Sessions in last 15 minutes
          </CardFooter>
        </Card>

        <Card className="border-dashed opacity-40" />
        <Card className="border-dashed opacity-40" />
      </div>

      <Card className="bg-primary/40 border-primary/20">
        <CardContent className="flex items-center justify-end px-4 py-2">
          <Button size="sm" variant="outline" onClick={() => window.location.href = "/users/new"}>
            <PlusIcon className="size-4" />
            Create User
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={users} />
        </CardContent>
      </Card>
    </div>
  )
}
