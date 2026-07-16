import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getWallpaper, searchWallpapers, type Wallpaper } from "@/lib/wallhaven";
import { addToHistory, addDownload, isFavorite, toggleFavorite, updateDownload } from "@/lib/storage";
import { WallpaperGrid, GridSkeleton } from "@/components/wallpaper-card";
import { Heart, Download, ExternalLink, Monitor, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallpaper/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const [w, setW] = useState<Wallpaper | null>(null);
  const [related, setRelated] = useState<Wallpaper[] | null>(null);
  const [fav, setFav] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setW(null);
    setError(false);
    getWallpaper(id)
      .then((r) => {
        setW(r.data);
        addToHistory(r.data);
        setFav(isFavorite(r.data.id));
        const tag = r.data.tags?.[0]?.name ?? "";
        return searchWallpapers({ q: tag, sorting: "relevance" });
      })
      .then((r) => setRelated(r ? r.data.filter((x) => x.id !== id).slice(0, 8) : []))
      .catch(() => setError(true));
  }, [id]);

  const onFav = () => { if (w) setFav(toggleFavorite(w)); };
  const onDownload = () => {
    if (!w) return;
    const rec = { id: `${w.id}-${Date.now()}`, wallpaper: w, status: "downloading" as const, progress: 30, timestamp: Date.now() };
    addDownload(rec);
    window.open(w.path, "_blank");
    setTimeout(() => updateDownload(rec.id, { status: "completed", progress: 100 }), 1200);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-lg font-medium">Wallpaper not found</p>
        <Link to="/" className="mt-4 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">Go home</Link>
      </div>
    );
  }

  if (!w) {
    return (
      <div className="mx-auto max-w-[1600px]">
        <div className="skeleton mb-6 rounded-3xl" style={{ aspectRatio: "16/9" }} />
        <GridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] animate-fade-in">
      <button onClick={() => history.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl bg-[var(--color-surface)]">
          <img src={w.path} alt={`Wallpaper ${w.id}`} className="h-auto w-full" />
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={onDownload} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
                <Download className="h-4 w-4" /> Download
              </button>
              <button onClick={onFav} aria-label="Favorite" className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-[var(--color-surface)]">
                <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
              </button>
            </div>
            <button className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium">
              <Monitor className="h-4 w-4" /> Set as Wallpaper
            </button>
            <a href={w.url} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-4 w-4" /> View on Wallhaven
            </a>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
            <dl className="space-y-2.5 text-sm">
              <Meta k="Resolution" v={w.resolution} />
              <Meta k="Dimensions" v={`${w.dimension_x} × ${w.dimension_y}`} />
              <Meta k="File Size" v={`${(w.file_size / 1024 / 1024).toFixed(2)} MB`} />
              <Meta k="Type" v={w.file_type} />
              <Meta k="Views" v={w.views.toLocaleString()} />
              <Meta k="Favorites" v={w.favorites.toLocaleString()} />
              <Meta k="Category" v={w.category} />
              <Meta k="Uploader" v={w.uploader?.username ?? "—"} />
            </dl>
          </div>

          {w.colors?.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colors</h3>
              <div className="flex flex-wrap gap-2">
                {w.colors.map((c) => (
                  <div key={c} className="h-7 w-7 rounded-full border border-border" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
          )}

          {w.tags && w.tags.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {w.tags.map((t) => (
                  <Link key={t.id} to="/discover" search={{ q: t.name } as never} className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-medium transition-colors hover:bg-foreground hover:text-background">
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-16">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">Related Wallpapers</h2>
        {related ? <WallpaperGrid items={related} /> : <GridSkeleton count={4} />}
      </section>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate font-medium">{v}</dd>
    </div>
  );
}
