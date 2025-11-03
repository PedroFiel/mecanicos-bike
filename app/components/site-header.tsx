import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { useMatches } from "react-router"
import type { RouteHandle } from "~/types/route"

export function SiteHeader() {
  const matches = useMatches()
  
  const matchWithTitle = [...matches].reverse().find(
    (match) => match.handle && (match.handle as RouteHandle).title
  )
  
  const title = matchWithTitle 
    ? (matchWithTitle.handle as RouteHandle).title 
    : "Home"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
