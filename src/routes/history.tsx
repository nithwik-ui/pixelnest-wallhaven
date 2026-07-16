import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-card";
import { clearHistory, getHistory } from "@/lib/storage";
import type { Wallpaper } from "@/lib/wallhaven";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const [items, setItems] = useState<Wallpaper[]>([]);

  useEffect(() => {
    const load = () => setItems(getHistory());
    load();
    window.addEventListener("pixelnest:storage", load);
    return () => window.removeEventListener("pixelnest:storage", load);
  }, []);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="History"
        subtitle="Wallpapers you've recently viewed."
        right={
          items.length > 0 ? (
            <button
              onClick={() => {
                clearHistory();
                setItems([]);
              }}
              className="rounded-full border border-border bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear history
            </button>
          ) : null
        }
      />
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] p-16 text-center">
          <div className="text-3xl">🕒</div>
          <p className="font-medium">No history yet</p>
          <p className="text-sm text-muted-foreground">Wallpapers you view will show up here.</p>
        </div>
      ) : (
        <WallpaperGrid items={items} />
      )}
    </div>
  );
}
