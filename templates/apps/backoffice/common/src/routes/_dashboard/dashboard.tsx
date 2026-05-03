import { createFileRoute } from "@tanstack/react-router"

import { SectionCards } from "@/components/dashboard/section-cards"
import { getDashboardDataFn } from "@/server/dashboard"

export const Route = createFileRoute("/_dashboard/dashboard")({
  loader: async () => getDashboardDataFn(),
  component: DashboardPage,
})

function DashboardPage() {
  const data = Route.useLoaderData()
  return <SectionCards {...data} />
}
