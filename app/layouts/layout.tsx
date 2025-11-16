import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "~/components/ui/sidebar"
import { NavigationProgress } from "~/components/navigation-progress"

import { Outlet, useLoaderData } from "react-router"
import type { Route } from "./+types/layout"
import { requireAuth } from "~/lib/auth.server"
import prisma from "../../prisma/prisma"

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request)
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true
    }
  })

  if (!user) {
    throw new Error("Usuário não encontrado")
  }

  return { user }
}

export default function () {
  const { user } = useLoaderData<typeof loader>()
  const outlet = <Outlet />
  
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <NavigationProgress />
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {outlet}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
