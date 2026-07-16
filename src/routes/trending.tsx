import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { InfiniteGrid } from "@/components/infinite-grid";

export const Route = createFileRoute("/trending")({ component: Trending });

function Trending() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="Trending" subtitle="The most loved wallpapers right now." />
      <InfiniteGrid params={{ sorting: "toplist", topRange: "1w", provider: "all" }} />
    </div>
  );
}
