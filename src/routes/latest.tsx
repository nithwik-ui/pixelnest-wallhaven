import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { InfiniteGrid } from "@/components/infinite-grid";

export const Route = createFileRoute("/latest")({ component: Latest });

function Latest() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="Latest" subtitle="Freshly uploaded wallpapers, updated in real time." />
      <InfiniteGrid params={{ sorting: "date_added" }} />
    </div>
  );
}
