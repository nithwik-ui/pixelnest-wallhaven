import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { getWallpaperById } from "@/lib/providers/registry";
import {
  addToHistory,
  addDownload,
  isFavorite,
  toggleFavorite,
  updateDownload,
  getCollections,
  createCollection,
  addToCollection,
  getSettings,
} from "@/lib/storage";
import { downloadWallpaper } from "@/lib/download";
import { WallpaperGrid, GridSkeleton } from "@/components/wallpaper-card";
import { searchProviders } from "@/lib/providers/registry";
import type { Wallpaper } from "@/lib/providers/types";
import {
  Heart,
  Download,
  ExternalLink,
  Monitor,
  ArrowLeft,
  Copy,
  FolderPlus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/wallpaper/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const [w, setW] = useState<Wallpaper | null>(null);
  const [related, setRelated] = useState<Wallpaper[] | null>(null);
  const [fav, setFav] = useState(false);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [settingWallpaper, setSettingWallpaper] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const collections = getCollections();

  useEffect(() => {
    setW(null);
    setError(false);
    getWallpaperById(id)
      .then((r) => {
        setW(r.data);
        addToHistory(r.data);
        setFav(isFavorite(r.data.id));
        const tag = r.data.tags?.[0]?.name ?? "";
        return searchProviders({
          q: tag || "landscape",
          sorting: "relevance",
          provider: r.data.provider as "wallhaven" | "pexels",
        });
      })
      .then((r) => setRelated(r ? r.data.filter((x) => x.id !== id).slice(0, 8) : []))
      .catch(() => setError(true));
  }, [id]);

  const onFav = () => {
    if (!w) return;
    const next = toggleFavorite(w);
    setFav(next);
    toast(next ? "Added to favorites ❤️" : "Removed from favorites", { duration: 2000 });
  };

  const onDownload = async () => {
    if (!w || downloading) return;
    setDownloading(true);
    try {
      toast.loading("Preparing download…", { id: `dl-detail-${w.id}` });
      await downloadWallpaper(w);
      toast.success("Download complete!", { id: `dl-detail-${w.id}`, duration: 3000 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      if (msg !== "Download cancelled") {
        toast.error(`Download failed: ${msg}`, { id: `dl-detail-${w.id}`, duration: 4000 });
      } else {
        toast.dismiss(`dl-detail-${w.id}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  const onSetWallpaper = async () => {
    if (!w || settingWallpaper) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      toast.error("Set as Wallpaper is only available in Desktop App.");
      return;
    }

    setSettingWallpaper(true);
    toast.loading("Downloading and setting wallpaper...", { id: "set-wp" });

    try {
      const filename = `pexelnest-${w.id}.${w.file_type?.split("/")[1] ?? "jpg"}`;
      const downloadFolder = getSettings().downloadFolder || "Pictures/PexelNest";

      const filePath = await electronAPI.downloadFile({
        url: w.path,
        filename,
        id: "wallpaper-set",
        folder: downloadFolder,
      });

      await electronAPI.setAsWallpaper(filePath);
      toast.success("Desktop wallpaper updated successfully!", { id: "set-wp", duration: 3000 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to set desktop wallpaper.", { id: "set-wp", duration: 4000 });
    } finally {
      setSettingWallpaper(false);
    }
  };

  const onCopyLink = () => {
    if (!w) return;
    navigator.clipboard.writeText(w.url).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard!", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onAddToCollection = (colId: string) => {
    if (!w) return;
    addToCollection(colId, w);
    toast.success("Added to collection!", { duration: 2000 });
    setShowCollections(false);
  };

  const onNewCollection = () => {
    const name = prompt("Collection name:");
    if (!name?.trim() || !w) return;
    const col = createCollection(name.trim());
    addToCollection(col.id, w);
    toast.success(`Added to "${name}"!`, { duration: 2000 });
    setShowCollections(false);
  };

  // Simulate download tracking (legacy support)
  const onDownloadLegacy = () => {
    if (!w) return;
    const rec = {
      id: `${w.id}-${Date.now()}`,
      wallpaper: w,
      status: "downloading" as const,
      progress: 30,
      timestamp: Date.now(),
    };
    addDownload(rec);
    setTimeout(() => updateDownload(rec.id, { status: "completed", progress: 100 }), 1200);
  };
  void onDownloadLegacy;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-lg font-medium">Wallpaper not found</p>
        <Link
          to="/"
          className="mt-4 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Go home
        </Link>
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

  const aspectRatio =
    w.dimension_x && w.dimension_y ? `${w.dimension_x} / ${w.dimension_y}` : "16 / 9";

  return (
    <div className="mx-auto max-w-[1600px] animate-fade-in">
      <button
        onClick={() => history.back()}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
        <div className="overflow-hidden rounded-3xl bg-[var(--color-surface)]">
          <img
            src={w.path}
            alt={`Wallpaper ${w.id}`}
            className="h-auto w-full"
            style={{ aspectRatio }}
          />
        </div>

        <aside className="space-y-5">
          {/* Actions */}
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={onDownload}
                disabled={downloading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                <Download className={cn("h-4 w-4", downloading && "animate-bounce")} />
                {downloading ? "Downloading…" : "Download"}
              </button>
              <button
                onClick={onFav}
                aria-label="Favorite"
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-[var(--color-surface)]"
              >
                <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
              </button>
            </div>

            <button
              onClick={onSetWallpaper}
              disabled={settingWallpaper}
              className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium hover:bg-background hover:scale-[1.01] transition-transform disabled:opacity-60"
            >
              <Monitor className="h-4 w-4" /> Set as Wallpaper
            </button>

            <button
              onClick={onCopyLink}
              className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>

            {/* Add to Collection */}
            <div className="relative">
              <button
                onClick={() => setShowCollections(!showCollections)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <FolderPlus className="h-4 w-4" /> Add to Collection
              </button>
              {showCollections && (
                <div className="absolute bottom-full mb-2 left-0 right-0 z-10 rounded-2xl border border-border bg-background p-2 shadow-[var(--shadow-elevated)]">
                  {collections.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No collections yet.</p>
                  )}
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => onAddToCollection(col.id)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-[var(--color-surface)]"
                    >
                      {col.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {col.wallpaperIds.length}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={onNewCollection}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-[var(--color-surface)] hover:text-foreground"
                  >
                    <FolderPlus className="h-3.5 w-3.5" /> New collection…
                  </button>
                </div>
              )}
            </div>

            <a
              href={w.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" /> View Original Source
            </a>
          </div>

          {/* Details */}
          <div className="rounded-2xl border border-border bg-background p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </h3>
            <dl className="space-y-2.5 text-sm">
              <Meta k="Resolution" v={w.resolution} />
              <Meta k="Dimensions" v={`${w.dimension_x} × ${w.dimension_y}`} />
              <Meta k="Aspect Ratio" v={w.ratio ?? "—"} />
              {w.file_size > 0 && (
                <Meta k="File Size" v={`${(w.file_size / 1024 / 1024).toFixed(2)} MB`} />
              )}
              <Meta k="Type" v={w.file_type} />
              <Meta k="Views" v={w.views.toLocaleString()} />
              <Meta k="Favorites" v={w.favorites.toLocaleString()} />
              <Meta k="Category" v={w.category} />
              {w.photographer && <Meta k="Photographer" v={w.photographer} />}
              {w.uploader?.username && <Meta k="Uploader" v={w.uploader.username} />}
            </dl>
          </div>

          {/* Color palette */}
          {w.colors?.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Colors
              </h3>
              <div className="flex flex-wrap gap-2">
                {w.colors.map((c) => (
                  <div
                    key={c}
                    className="h-7 w-7 rounded-full border border-border"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {w.tags && w.tags.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {w.tags.map((t) => (
                  <Link
                    key={t.id}
                    to="/discover"
                    search={{ q: t.name } as never}
                    className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-medium transition-colors hover:bg-foreground hover:text-background"
                  >
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
      <dd className="truncate font-medium capitalize">{v}</dd>
    </div>
  );
}
