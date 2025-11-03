import type { Route } from "./+types/home";
import { requireAuth } from "~/lib/auth.server";
import { useLoaderData } from "react-router";
import prisma from "prisma/prisma";
import type { RouteHandle } from "~/types/route";

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
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  
  if (!user) {
    throw new Error("Usuário não encontrado");
  }
  
  return { user };
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>Home</h1>
      <p>Bem-vindo, {user.name}!</p>
      <p>Email: {user.email}</p>
    </div>
  );
}
