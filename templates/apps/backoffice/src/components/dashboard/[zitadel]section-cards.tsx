import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ExternalLinkIcon } from "lucide-react"

interface SectionCardsProps {
  userCount: number
  zitadelConsoleUrl: string
}

export function SectionCards({ userCount, zitadelConsoleUrl }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {userCount.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            All users across platform
          </div>
          <a
            href={zitadelConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground flex items-center gap-1 hover:underline"
          >
            Open Auth Console
            <ExternalLinkIcon className="size-3" />
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}
