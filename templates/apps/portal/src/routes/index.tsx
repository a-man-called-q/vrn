import { createFileRoute, redirect } from "@tanstack/react-router"
import { BRAND } from "@workspace/ui/lib/brand"
import { Logo } from "@workspace/ui/components/logo"
import { Button } from "@workspace/ui/components/button"

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ href: "/login" })
    }
  },
  component: App,
})

function App() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md min-w-0 flex-col items-center gap-6 text-center">
        <Logo className="size-16 text-primary" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {BRAND.name} Portal
          </h1>
          <p className="text-muted-foreground">
            Welcome to the {{titleCase name}} application. Use the button below to get started.
          </p>
        </div>
        <Button size="lg" className="px-8">
          Launch Dashboard
        </Button>
      </div>
    </div>
  )
}
