import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { searchProviders } from "@/lib/providers/registry";
import { CATEGORY_PRESETS } from "@/lib/wallhaven";
import type { Wallpaper } from "@/lib/providers/types";
import { getHistory } from "@/lib/storage";
import { WallpaperGrid, GridSkeleton } from "@/components/wallpaper-card";
import { PageHeader } from "@/components/app-shell";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Section({
  title,
  to,
  children,
}: {
  title: string;
  to?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {to && (
          <Link
            to={to as never}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Home() {
  const [featured, setFeatured] = useState<Wallpaper[] | null>(null);
  const [trending, setTrending] = useState<Wallpaper[] | null>(null);
  const [latest, setLatest] = useState<Wallpaper[] | null>(null);
  const [history, setHistory] = useState<Wallpaper[]>([]);

  useEffect(() => {
    setHistory(getHistory().slice(0, 8));
    searchProviders({ sorting: "toplist", topRange: "1w" })
      .then((r) => setFeatured(r.data.slice(0, 8)))
      .catch(() => setFeatured([]));
    searchProviders({ sorting: "hot" })
      .then((r) => setTrending(r.data.slice(0, 8)))
      .catch(() => setTrending([]));
    searchProviders({ sorting: "date_added" })
      .then((r) => setLatest(r.data.slice(0, 8)))
      .catch(() => setLatest([]));
  }, []);

  const hero = featured?.[0];

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Hero */}
      <div
        className="relative mb-12 overflow-hidden rounded-3xl bg-[var(--color-surface)]"
        style={{ aspectRatio: "21/9" }}
      >
        {hero ? (
          <Link to="/wallpaper/$id" params={{ id: hero.id }} className="group block h-full w-full">
            <img
              src={hero.thumbs.original}
              alt="Featured"
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-10 text-white">
              <div className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md">
                Featured this week
              </div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Discover your next wallpaper
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                Millions of hand-curated, high-resolution wallpapers powered by Nithwik Studios.
              </p>
            </div>
          </Link>
        ) : (
          <div className="skeleton h-full w-full" />
        )}
      </div>

      <Section title="Featured Wallpapers" to="/trending">
        {featured ? <WallpaperGrid items={featured} /> : <GridSkeleton />}
      </Section>

      <Section title="Trending" to="/trending">
        {trending ? <WallpaperGrid items={trending} /> : <GridSkeleton />}
      </Section>

      <Section title="Popular Categories" to="/categories">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_PRESETS.slice(3, 9).map((c) => (
            <Link
              key={c.label}
              to="/discover"
              search={{ q: c.q } as never}
              className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--color-surface)] p-6 text-left transition-all hover:shadow-[var(--shadow-elevated)]"
            >
              <div
                className="mb-8 h-8 w-8 rounded-full transition-transform group-hover:scale-125"
                style={{ background: c.color }}
              />
              <div className="font-medium">{c.label}</div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Latest" to="/latest">
        {latest ? <WallpaperGrid items={latest} /> : <GridSkeleton />}
      </Section>

      {history.length > 0 && (
        <Section title="Recently Viewed" to="/history">
          <WallpaperGrid items={history} />
        </Section>
      )}
    </div>
  );
}
