import { useRouterState } from "@tanstack/react-router"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/users": "Users",
  "/users/new": "Create User",
  "/roles": "Roles",
  "/roles/new": "Create Role",
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = titles[pathname] ?? "Dashboard"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
