import { useFetcher } from "react-router";
import { IconReceipt2 } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

/** Botão rápido "Marcar como pago" para as listas de atendimentos. */
export function MarkAsPaidButton({ appointmentId }: { appointmentId: number }) {
  const fetcher = useFetcher<{ success: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" action={`/appointments/${appointmentId}`} className="inline-flex flex-col items-end">
      <input type="hidden" name="intent" value="mark_as_paid" />
      <Button type="submit" variant="outline" size="sm" disabled={busy} title="Registrar o pagamento do valor total">
        {busy ? <Spinner className="mr-1 h-3 w-3" /> : <IconReceipt2 className="mr-1 h-3 w-3 text-emerald-600" />}
        Marcar como pago
      </Button>
      {fetcher.data?.error && <span className="text-xs text-red-500">{fetcher.data.error}</span>}
    </fetcher.Form>
  );
}
