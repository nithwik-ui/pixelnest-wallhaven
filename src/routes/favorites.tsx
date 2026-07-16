import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-card";
import { getFavorites } from "@/lib/storage";
import type { Wallpaper } from "@/lib/wallhaven";
import { Search } from "lucide-react";

export const Route = createFileRoute("/favorites")({ component: Favorites });

function Favorites() {
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "views" | "favorites">("recent");

  useEffect(() => {
    const load = () => setItems(getFavorites());
    load();
    const onChange = () => load();
    window.addEventListener("pixelnest:storage", onChange);
    return () => window.removeEventListener("pixelnest:storage", onChange);
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (q)
      list = list.filter(
        (w) =>
          w.id.includes(q) ||
          (w.tags ?? []).some((t) => t.name.toLowerCase().includes(q.toLowerCase())),
      );
    if (sort === "views") list = [...list].sort((a, b) => b.views - a.views);
    if (sort === "favorites") list = [...list].sort((a, b) => b.favorites - a.favorites);
    return list;
  }, [items, q, sort]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Favorites"
        subtitle={`${items.length} saved wallpaper${items.length === 1 ? "" : "s"}.`}
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search favorites"
                className="h-10 rounded-full border border-border bg-[var(--color-surface)] pl-9 pr-4 text-sm outline-none focus:bg-background"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as never)}
              className="h-10 rounded-full border border-border bg-[var(--color-surface)] px-4 text-sm outline-none"
            >
              <option value="recent">Recently Added</option>
              <option value="views">Most Viewed</option>
              <option value="favorites">Most Favorited</option>
            </select>
          </div>
        }
      />
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] p-16 text-center">
          <div className="text-3xl">💙</div>
          <p className="font-medium">No favorites yet</p>
          <p className="text-sm text-muted-foreground">
            Tap the heart on any wallpaper to save it here.
          </p>
        </div>
      ) : (
        <WallpaperGrid items={filtered} />
      )}
    </div>
  );
}
