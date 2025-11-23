import * as React from "react"
import {
  IconBike, IconDashboard, IconSettings, IconUsers
} from "@tabler/icons-react"

import { NavMain } from "~/components/nav-main"
import { NavSecondary } from "~/components/nav-secondary"
import { NavUser } from "~/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import { NavLink } from "react-router"

interface User {
  id: number
  name: string
  email: string
  phone: string | null
  image: string | null
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
}

const navData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: IconUsers,
    }
  ],
  navSecondary: [
    {
      title: "Configurações",
      url: "/settings",
      icon: IconSettings,
    }
  ]
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const userData = {
    name: user.name,
    email: user.email,
    image: user.image ?? undefined,
    phone: user.phone,
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <NavLink to="/">
                <IconBike className="!size-5" />
                <span className="text-base font-semibold">Acompanhamento de Clientes para Mecânicos de Bike</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
