import { lazy, Suspense } from "react";
import type { RouteHandle } from "~/types/route";
import { SectionCards } from "~/components/section-cards";

const ChartAreaInteractive = lazy(() =>
  import("~/components/chart-area-interactive").then((mod) => ({
    default: mod.ChartAreaInteractive,
  }))
);

const DataTable = lazy(() =>
  import("~/components/data-table").then((mod) => ({
    default: mod.DataTable,
  }))
);

import data from "../dashboard/data.json";

export const handle: RouteHandle = {
  title: "Dashboard",
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <Suspense fallback={<LoadingFallback />}>
          <ChartAreaInteractive />
        </Suspense>
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <DataTable data={data} />
      </Suspense>
    </div>
  );
}
