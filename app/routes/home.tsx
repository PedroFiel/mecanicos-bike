import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mecânicos Bike" },
    { name: "description", content: "Sistema de gerenciamento para oficina de bicicletas" },
  ];
}

export default function Home() {
  return <Welcome />;
}
