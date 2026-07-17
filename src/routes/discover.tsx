import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { InfiniteGrid } from "@/components/infinite-grid";
import { WallpaperGrid, GridSkeleton } from "@/components/wallpaper-card";
import { POPULAR_COLORS, CATEGORY_PRESETS } from "@/lib/wallhaven";
import { searchProviders } from "@/lib/providers/registry";
import type { Wallpaper } from "@/lib/providers/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

type DiscoverSearch = {
  q?: string;
  sorting?: "relevance" | "date_added" | "views" | "favorites" | "random" | "toplist" | "hot";
  atleast?: string;
  ratios?: string;
  categories?: string;
  purity?: string;
  colors?: string;
  provider?: "wallhaven" | "pexels" | "pixabay" | "all";
};

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>): DiscoverSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    sorting: search.sorting as DiscoverSearch["sorting"],
    atleast: typeof search.atleast === "string" ? search.atleast : undefined,
    ratios: typeof search.ratios === "string" ? search.ratios : undefined,
    categories: typeof search.categories === "string" ? search.categories : undefined,
    purity: typeof search.purity === "string" ? search.purity : undefined,
    colors: typeof search.colors === "string" ? search.colors : undefined,
    provider: search.provider as DiscoverSearch["provider"],
  }),
  component: Discover,
});

const RES_OPTS = [
  { label: "1080p", value: "1920x1080" },
  { label: "1440p", value: "2560x1440" },
  { label: "4K", value: "3840x2160" },
  { label: "5K", value: "5120x2880" },
  { label: "8K", value: "7680x4320" },
];
const ORIENT_OPTS = [
  { label: "Landscape", value: "landscape" },
  { label: "Portrait", value: "portrait" },
  { label: "Square", value: "1x1,4x3" },
];
const SORT_OPTS = [
  { label: "Relevance", value: "relevance" },
  { label: "Date Added", value: "date_added" },
  { label: "Views", value: "views" },
  { label: "Favorites", value: "favorites" },
  { label: "Random", value: "random" },
] as const;
const CAT_OPTS = [
  { label: "General", value: "100" },
  { label: "Anime", value: "010" },
  { label: "People", value: "001" },
  { label: "All", value: "111" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-[var(--color-surface)] text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ─── Curated Section (shown when no query) ───────────────────────────────────

function CuratedSection({ title, params, to }: { title: string; params: object; to?: string }) {
  const [items, setItems] = useState<Wallpaper[] | null>(null);

  useEffect(() => {
    searchProviders({ ...params, page: 1 } as Parameters<typeof searchProviders>[0])
      .then((r) => setItems(r.data.slice(0, 8)))
      .catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

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
      {items ? <WallpaperGrid items={items} /> : <GridSkeleton />}
    </section>
  );
}

function DiscoverHome() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="Discover" subtitle="Explore millions of stunning wallpapers." />
      <CuratedSection
        title="Featured Wallpapers"
        params={{ sorting: "toplist", topRange: "1w" }}
        to="/trending"
      />
      <CuratedSection title="Trending Now" params={{ sorting: "hot" }} to="/trending" />
      <CuratedSection
        title="Nature"
        params={{ q: "nature landscape", sorting: "toplist" }}
        to="/discover?q=nature"
      />
      <CuratedSection
        title="Cars"
        params={{ q: "cars automotive supercar", sorting: "toplist" }}
        to="/discover?q=cars"
      />
      <CuratedSection
        title="Anime"
        params={{ q: "anime illustration", categories: "010", sorting: "toplist" }}
        to="/discover?q=anime"
      />
      <CuratedSection
        title="Gaming"
        params={{ q: "gaming game video game", sorting: "toplist" }}
        to="/discover?q=gaming"
      />
      <CuratedSection
        title="Space"
        params={{ q: "space galaxy stars", sorting: "toplist" }}
        to="/discover?q=space"
      />
      <CuratedSection
        title="Minimal"
        params={{ q: "minimal minimalist clean", sorting: "toplist" }}
        to="/discover?q=minimal"
      />
      <CuratedSection title="Recently Added" params={{ sorting: "date_added" }} to="/latest" />
    </div>
  );
}

function Discover() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/discover" });

  const set = (patch: Record<string, string | undefined>) => {
    navigate({ search: (prev: DiscoverSearch) => ({ ...prev, ...patch }) as never });
  };

  // Show curated home when no query and no active filters
  const hasQuery = !!search.q;
  const hasFilters = !!(
    search.sorting ||
    search.atleast ||
    search.ratios ||
    search.categories ||
    search.colors
  );

  if (!hasQuery && !hasFilters) {
    return <DiscoverHome />;
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title={search.q ? `Results for "${search.q}"` : "Discover"}
        subtitle="Search millions of wallpapers with powerful filters."
      />

      <div className="mb-8 space-y-4 rounded-2xl border border-border bg-[var(--color-surface)] p-5">
        <FilterRow label="Provider">
          {[
            { label: "All Sources", value: "all" },
            { label: "Wallhaven", value: "wallhaven" },
            { label: "Pexels", value: "pexels" },
            { label: "Pixabay", value: "pixabay" },
          ].map((o) => (
            <Chip
              key={o.value}
              active={(search.provider ?? "all") === o.value}
              onClick={() => set({ provider: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Sort">
          {SORT_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={(search.sorting ?? "relevance") === o.value}
              onClick={() => set({ sorting: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Resolution">
          <Chip active={!search.atleast} onClick={() => set({ atleast: undefined })}>
            Any
          </Chip>
          {RES_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={search.atleast === o.value}
              onClick={() => set({ atleast: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Orientation">
          <Chip active={!search.ratios} onClick={() => set({ ratios: undefined })}>
            Any
          </Chip>
          {ORIENT_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={search.ratios === o.value}
              onClick={() => set({ ratios: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Category">
          {CAT_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={(search.categories ?? "111") === o.value}
              onClick={() => set({ categories: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Color">
          <button
            onClick={() => set({ colors: undefined })}
            className={cn(
              "h-6 w-6 rounded-full border transition-transform hover:scale-110",
              !search.colors ? "border-foreground ring-2 ring-foreground/20" : "border-border",
            )}
            style={{
              background:
                "conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)",
            }}
            title="Any"
          />
          {POPULAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => set({ colors: c })}
              className={cn(
                "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                search.colors === c
                  ? "ring-2 ring-foreground/40 border-foreground"
                  : "border-border",
              )}
              style={{ background: `#${c}` }}
              title={`#${c}`}
            />
          ))}
        </FilterRow>

        {/* Quick categories */}
        <FilterRow label="Quick">
          {CATEGORY_PRESETS.slice(0, 8).map((c) => (
            <Chip key={c.label} active={search.q === c.q} onClick={() => set({ q: c.q })}>
              {c.label}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <InfiniteGrid params={{ ...search, provider: search.provider ?? "all" }} />
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-2 w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
