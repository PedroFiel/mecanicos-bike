import type { RouteHandle } from "~/types/route";

export const handle: RouteHandle = {
  title: "Minha Conta",
};

export default function Page() {
  return (
    <div>
      <h1>Account</h1>
    </div>
  )
}