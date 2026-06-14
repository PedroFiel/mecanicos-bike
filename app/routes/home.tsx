import type { Route } from "./+types/home";
import { requireAuth } from "~/lib/auth.server";
import { useLoaderData } from "react-router";
import { getUserById } from "~/services/users.server";
import type { RouteHandle } from "~/types/route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export const handle: RouteHandle = {
  title: "Home",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mecânicos Bike" },
    { name: "description", content: "Sistema de gerenciamento para oficina de bicicletas" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireAuth(request);
  
  const user = await getUserById(userId)

  if (!user) {
    throw new Response("Usuário não encontrado", { status: 404 })
  }
  
  return { user };
}

export default function Page() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bem-vindo, {user.name}!</CardTitle>
            <CardDescription>
              Sistema de gerenciamento para oficina de bicicletas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Você está logado como: <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
