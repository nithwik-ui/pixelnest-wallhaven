import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { CATEGORY_PRESETS, searchWallpapers, type Wallpaper } from "@/lib/wallhaven";

export const Route = createFileRoute("/categories")({ component: Categories });

function Categories() {
  const [thumbs, setThumbs] = useState<Record<string, Wallpaper | null>>({});

  useEffect(() => {
    CATEGORY_PRESETS.forEach((c) => {
      searchWallpapers({ q: c.q, sorting: "toplist", topRange: "1M" })
        .then((r) => setThumbs((t) => ({ ...t, [c.label]: r.data[0] ?? null })))
        .catch(() => setThumbs((t) => ({ ...t, [c.label]: null })));
    });
  }, []);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="Categories" subtitle="Explore wallpapers by curated collection." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CATEGORY_PRESETS.map((c) => {
          const t = thumbs[c.label];
          return (
            <Link
              key={c.label}
              to="/discover"
              search={{ q: c.q } as never}
              className="group relative block overflow-hidden rounded-2xl bg-[var(--color-surface)] hover-lift hover:shadow-[var(--shadow-elevated)]"
              style={{ aspectRatio: "4/3" }}
            >
              {t ? (
                <img src={t.thumbs.large} alt={c.label} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="skeleton h-full w-full" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-lg font-semibold">{c.label}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
