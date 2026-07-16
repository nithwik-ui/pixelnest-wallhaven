import { useEffect, useRef, useState, useCallback } from "react";
import { searchProviders, type SearchParams } from "@/lib/providers/registry";
import type { Wallpaper } from "@/lib/providers/types";
import { WallpaperGrid, GridSkeleton } from "./wallpaper-card";

export function InfiniteGrid({ params }: { params: SearchParams }) {
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const paramKey = JSON.stringify(params);

  const load = useCallback(
    async (p: number, reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchProviders({ ...params, page: p });
        setItems((prev) => (reset ? res.data : [...prev, ...res.data]));
        if (res.data.length === 0 || p >= res.meta.last_page) setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load wallpapers");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramKey],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setDone(false);
    load(1, true);
  }, [paramKey, load]);

  useEffect(() => {
    if (!sentinel.current || done || loading) return;
    const el = sentinel.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !done) {
          const next = page + 1;
          setPage(next);
          load(next);
        }
      },
      { rootMargin: "800px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, loading, done, load]);

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[var(--color-surface)] p-16 text-center">
        <div className="text-3xl">⚠️</div>
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => load(1, true)}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] p-16 text-center">
        <div className="text-3xl">🔍</div>
        <p className="font-medium">No wallpapers found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <>
      {items.length === 0 && loading ? <GridSkeleton /> : <WallpaperGrid items={items} />}
      {items.length > 0 && loading && (
        <div className="mt-6">
          <GridSkeleton count={4} />
        </div>
      )}
      <div ref={sentinel} className="h-10" />
      {done && items.length > 0 && (
        <p className="mt-8 text-center text-xs text-muted-foreground">You've reached the end.</p>
      )}
    </>
  );
}
