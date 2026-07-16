import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { PageHeader } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-card";
import {
  getFavorites,
  getHistory,
  getDownloads,
  getCollections,
  deleteCollection,
  type Collection,
  type DownloadRecord,
} from "@/lib/storage";
import type { Wallpaper } from "@/lib/providers/types";
import { Heart, Download, History, BookOpen, Trash2, FolderPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({ component: LibraryPage });

type Tab = "favorites" | "downloads" | "collections" | "history";

function LibraryPage() {
  const [tab, setTab] = useState<Tab>("favorites");
  const [favorites, setFavorites] = useState<Wallpaper[]>([]);
  const [history, setHistory] = useState<Wallpaper[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [q, setQ] = useState("");

  const load = () => {
    setFavorites(getFavorites());
    setHistory(getHistory());
    setDownloads(getDownloads());
    setCollections(getCollections());
  };

  useEffect(() => {
    load();
    window.addEventListener("pixelnest:storage", load);
    return () => window.removeEventListener("pixelnest:storage", load);
  }, []);

  const TABS = [
    { id: "favorites" as Tab, label: "Favorites", icon: Heart, count: favorites.length },
    {
      id: "downloads" as Tab,
      label: "Downloaded",
      icon: Download,
      count: downloads.filter((d) => d.status === "completed").length,
    },
    { id: "collections" as Tab, label: "Collections", icon: BookOpen, count: collections.length },
    { id: "history" as Tab, label: "History", icon: History, count: history.length },
  ];

  const filterItems = useCallback(
    (items: Wallpaper[]) => {
      if (!q) return items;
      return items.filter(
        (w) =>
          w.id.includes(q) ||
          (w.tags ?? []).some((t) => t.name.toLowerCase().includes(q.toLowerCase())),
      );
    },
    [q],
  );

  const favFiltered = useMemo(() => filterItems(favorites), [favorites, filterItems]);
  const histFiltered = useMemo(() => filterItems(history), [history, filterItems]);
  const dlWallpapers = useMemo(
    () => downloads.filter((d) => d.status === "completed").map((d) => d.wallpaper),
    [downloads],
  );
  const dlFiltered = useMemo(() => filterItems(dlWallpapers), [dlWallpapers, filterItems]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Library"
        subtitle="Your personal wallpaper collection."
        right={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search library…"
              className="h-10 rounded-full border border-border bg-[var(--color-surface)] pl-9 pr-4 text-sm outline-none focus:bg-background"
            />
          </div>
        }
      />

      {/* Tab bar */}
      <div className="mb-8 flex gap-1 rounded-2xl border border-border bg-[var(--color-surface)] p-1.5">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              tab === id
                ? "bg-background text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  tab === id ? "bg-foreground/10" : "bg-foreground/5",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "favorites" && (
        <EmptyOrGrid
          items={favFiltered}
          emptyIcon="💙"
          emptyTitle="No favorites yet"
          emptyText="Tap the heart on any wallpaper to save it here."
        />
      )}

      {tab === "downloads" && (
        <EmptyOrGrid
          items={dlFiltered}
          emptyIcon="📥"
          emptyTitle="No downloads yet"
          emptyText="Download wallpapers to access them here."
        />
      )}

      {tab === "history" && (
        <div>
          {histFiltered.length > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem("pixelnest.history");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" /> Clear history
              </button>
            </div>
          )}
          <EmptyOrGrid
            items={histFiltered}
            emptyIcon="🕒"
            emptyTitle="No history yet"
            emptyText="Wallpapers you view will show up here."
          />
        </div>
      )}

      {tab === "collections" && (
        <CollectionsTab
          collections={collections}
          onDelete={(id) => {
            deleteCollection(id);
            setCollections(getCollections());
          }}
        />
      )}
    </div>
  );
}

function EmptyOrGrid({
  items,
  emptyIcon,
  emptyTitle,
  emptyText,
}: {
  items: Wallpaper[];
  emptyIcon: string;
  emptyTitle: string;
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] p-16 text-center">
        <div className="text-3xl">{emptyIcon}</div>
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }
  return <WallpaperGrid items={items} />;
}

function CollectionsTab({
  collections,
  onDelete,
}: {
  collections: Collection[];
  onDelete: (id: string) => void;
}) {
  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] p-16 text-center">
        <div className="text-3xl">📁</div>
        <p className="font-medium">No collections yet</p>
        <p className="text-sm text-muted-foreground">
          Open any wallpaper and tap "Add to Collection" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {collections.map((col) => (
        <div
          key={col.id}
          className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--color-surface)] hover-lift hover:shadow-[var(--shadow-elevated)]"
          style={{ aspectRatio: "4/3" }}
        >
          {col.cover ? (
            <img
              src={col.cover.thumbs.large}
              alt={col.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FolderPlus className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <div className="text-lg font-semibold">{col.name}</div>
            <div className="text-xs text-white/70">
              {col.wallpaperIds.length} wallpaper{col.wallpaperIds.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm(`Delete "${col.name}"?`)) onDelete(col.id);
            }}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 hover:bg-black/80"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Link
        to="/discover"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-[var(--color-surface)] text-center text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        style={{ aspectRatio: "4/3" }}
      >
        <FolderPlus className="h-8 w-8" />
        <span className="text-sm font-medium">Discover wallpapers</span>
      </Link>
    </div>
  );
}
