import { Link } from "@tanstack/react-router";
import { Heart, Download, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import type { Wallpaper } from "@/lib/wallhaven";
import { isFavorite, toggleFavorite } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function WallpaperCard({ w }: { w: Wallpaper }) {
  const [fav, setFav] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setFav(isFavorite(w.id)), [w.id]);

  const onFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(toggleFavorite(w));
  };

  const onDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(w.path, "_blank");
  };

  return (
    <Link
      to="/wallpaper/$id"
      params={{ id: w.id }}
      className="group relative block overflow-hidden rounded-2xl bg-[var(--color-surface)] hover-lift hover:shadow-[var(--shadow-elevated)] animate-fade-in"
      style={{ aspectRatio: `${w.dimension_x} / ${w.dimension_y}` }}
    >
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <img
        src={w.thumbs.large}
        alt={`Wallpaper ${w.id}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute left-3 top-3 flex gap-2">
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {w.resolution}
        </span>
      </div>

      <button
        onClick={onFav}
        aria-label="Favorite"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black opacity-0 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white group-hover:opacity-100"
      >
        <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
      </button>

      <div className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-between opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center gap-3 text-xs text-white">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {w.views.toLocaleString()}</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {w.favorites.toLocaleString()}</span>
        </div>
        <button
          onClick={onDownload}
          aria-label="Download"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black backdrop-blur-md transition-transform hover:scale-110 hover:bg-white"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </Link>
  );
}

export function WallpaperGrid({ items }: { items: Wallpaper[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((w) => (
        <WallpaperCard key={w.id} w={w} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton rounded-2xl" style={{ aspectRatio: "16/10" }} />
      ))}
    </div>
  );
}
