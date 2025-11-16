import type { Route } from "./+types/settings"
import type { RouteHandle } from "~/types/route"
import { requireAuth } from "~/lib/auth.server"
import { ThemeSelector } from "~/features/settings/components"

export const handle: RouteHandle = {
  title: "Configurações",
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request)
  return {}
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      <ThemeSelector />
    </div>
  )
}