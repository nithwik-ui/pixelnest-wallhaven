import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { CATEGORY_PRESETS } from "@/lib/wallhaven";
import { searchProviders } from "@/lib/providers/registry";
import type { Wallpaper } from "@/lib/providers/types";
import {
  Monitor,
  Star,
  Trees,
  Mountain,
  Waves,
  Snowflake,
  Sun,
  Building2,
  Landmark,
  Cpu,
  Layers,
  Minus,
  Moon,
  Circle,
  Zap,
  Sparkles,
  Rocket,
  Brain,
  Gamepad2,
  Tv,
  Film,
  Music,
  Camera,
  PawPrint,
  Car,
  Trophy,
  Sailboat,
  TreePine,
  MonitorPlay,
  Globe,
  Sunset,
  Sunrise,
  Droplet,
  Bike,
  Code,
  Lightbulb,
  Flower2,
  Bird,
  Wand,
  Smartphone,
  Leaf,
  Sprout,
} from "lucide-react";

export const Route = createFileRoute("/categories")({ component: Categories });

// Map icon name strings to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Monitor,
  MonitorPlay,
  Tv,
  Star,
  Trees,
  Mountain,
  Waves,
  Snowflake,
  Sun,
  Building2,
  Landmark,
  Cpu,
  Layers,
  Minus,
  Moon,
  Circle,
  Zap,
  Sparkles,
  Rocket,
  Brain,
  Gamepad2,
  Film,
  Music,
  Camera,
  PawPrint,
  Car,
  Trophy,
  Sailboat,
  TreePine,
  Globe,
  Sunset,
  Sunrise,
  Droplet,
  Bike,
  Code,
  Lightbulb,
  Flower2,
  Bird,
  Wand,
  Smartphone,
  Leaf,
  Sprout,
};

function Categories() {
  const [thumbs, setThumbs] = useState<Record<string, Wallpaper | null>>({});

  useEffect(() => {
    let active = true;

    const fetchAll = async () => {
      for (const c of CATEGORY_PRESETS) {
        if (!active) break;
        const params: Parameters<typeof searchProviders>[0] = {
          q: c.q,
          sorting: "toplist",
          topRange: "1M",
          ...(c.atleast ? { atleast: c.atleast } : {}),
          ...(c.orientation ? { orientation: c.orientation } : {}),
          ...(c.provider ? { provider: c.provider } : {}),
        };

        try {
          const r = await searchProviders(params);
          if (active) {
            setThumbs((t) => ({ ...t, [c.label]: r.data[0] ?? null }));
          }
        } catch {
          if (active) {
            setThumbs((t) => ({ ...t, [c.label]: null }));
          }
        }
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    };

    fetchAll();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Categories"
        subtitle={`Explore ${CATEGORY_PRESETS.length} curated wallpaper collections.`}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CATEGORY_PRESETS.map((c) => {
          const t = thumbs[c.label];
          const Icon = ICON_MAP[c.icon] ?? Monitor;
          return (
            <Link
              key={c.label}
              to="/discover"
              search={
                {
                  q: c.q,
                  ...(c.atleast ? { atleast: c.atleast } : {}),
                  ...(c.orientation ? { orientation: c.orientation } : {}),
                  ...(c.provider ? { provider: c.provider } : {}),
                } as never
              }
              className="group relative block overflow-hidden rounded-2xl bg-[var(--color-surface)] hover-lift hover:shadow-[var(--shadow-elevated)]"
              style={{ aspectRatio: "4/3" }}
            >
              {t ? (
                <img
                  src={t.thumbs.large}
                  alt={c.label}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="skeleton h-full w-full" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Icon badge */}
              <div
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl backdrop-blur-md"
                style={{ background: `${c.color}33` }}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-lg font-semibold">{c.label}</div>
                <div className="mt-0.5 text-xs text-white/70">{c.description}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
