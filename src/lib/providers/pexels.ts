/**
 * Pexels provider.
 *
 * Maps Pexels Photo API responses to UnifiedWallpaper.
 * Proxied through /api/pexels/* (key stays server-side).
 * API key sourced from VITE_PEXELS_API_KEY env var on the server;
 * user can also set a custom key in Settings (passed via X-Pexels-Key header).
 *
 * Quality defaults:
 *   • orientation = landscape
 *   • min size = "large" (≥1280px wide from Pexels free tier)
 *   • per_page = 24
 */
import type { WallpaperProvider, SearchParams, SearchResponse, Wallpaper } from "./types";
import { cache, cacheKey } from "../cache";
import { getSettings } from "../storage";

const BASE = "/api/pexels";
const CACHE_TTL = 120;
const PER_PAGE = 24;

// ─── Pexels API Types ─────────────────────────────────────────────────────────

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string | null;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function deriveRatio(w: number, h: number): string {
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

function orient(w: number, h: number) {
  if (w > h) return "landscape" as const;
  if (h > w) return "portrait" as const;
  return "square" as const;
}

/** Split Pexels alt text into cleaned tag objects */
function parseTags(alt: string): { id: number; name: string }[] {
  return alt
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 10)
    .map((t, i) => ({ id: i, name: t.toLowerCase() }));
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

function mapPhoto(photo: PexelsPhoto): Wallpaper {
  const w = photo.width;
  const h = photo.height;
  const res = `${w}x${h}`;
  const color = photo.avg_color ?? "#1a1a2e";

  return {
    // ── Unified fields ──────────────────────────────────────────
    id: `pexels-${photo.id}`,
    title: photo.alt || `Photo by ${photo.photographer}`,
    provider: "pexels",
    thumbnail: photo.src.medium,
    preview: photo.src.large2x,
    original: photo.src.original,
    width: w,
    height: h,
    resolution: res,
    orientation: orient(w, h),
    category: "general",
    tags: parseTags(photo.alt ?? ""),
    author: photo.photographer,
    sourceUrl: photo.url,
    downloadUrl: photo.src.original,
    license: "Pexels",
    dominantColor: color,

    // ── Legacy compat ────────────────────────────────────────────
    url: photo.url,
    short_url: photo.url,
    views: 0,
    favorites: 0,
    source: photo.url,
    purity: "sfw",
    dimension_x: w,
    dimension_y: h,
    ratio: deriveRatio(w, h),
    file_size: 0,
    file_type: "image/jpeg",
    created_at: new Date().toISOString(),
    colors: color ? [color] : [],
    path: photo.src.original,
    thumbs: {
      small: photo.src.small,
      large: photo.src.large2x,
      original: photo.src.original,
    },
    photographer: photo.photographer,
    photographer_url: photo.photographer_url,
  };
}

// ─── Request helper ───────────────────────────────────────────────────────────

function pexelsFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const s = getSettings();
    if (s.pexelsApiKey?.trim()) headers["X-Pexels-Key"] = s.pexelsApiKey.trim();
  }
  return fetch(url, { headers });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const pexelsProvider: WallpaperProvider = {
  id: "pexels",
  name: "Pexels",

  async search(params: SearchParams): Promise<SearchResponse> {
    const key = cacheKey("px:search", params as Record<string, unknown>);
    const hit = cache.get<SearchResponse>(key);
    if (hit) return hit;

    const page = params.page ?? 1;
    const isCurated =
      !params.q || params.q.trim() === "" || params.q.trim().toLowerCase() === "wallpaper";

    const sp = new URLSearchParams({
      page: String(page),
      per_page: String(PER_PAGE),
      size: "large",
    });
    if (params.orientation && params.orientation !== "any") {
      sp.set("orientation", params.orientation);
    } else if (!params.orientation) {
      sp.set("orientation", "landscape");
    }

    let endpoint = `${BASE}/v1/search`;
    if (isCurated) {
      endpoint = `${BASE}/v1/curated`;
    } else {
      sp.set("query", params.q!);
    }

    const res = await pexelsFetch(`${endpoint}?${sp.toString()}`);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Pexels API key is missing or invalid. Set VITE_PEXELS_API_KEY in your .env file.",
        );
      }
      if (res.status === 503) {
        throw new Error("Pexels API key not configured. Add VITE_PEXELS_API_KEY to .env");
      }
      throw new Error(`Pexels ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as PexelsSearchResponse;
    const totalResults = json.total_results ?? 1000;
    const totalPages = Math.max(1, Math.ceil(totalResults / PER_PAGE));

    const result: SearchResponse = {
      data: json.photos.map(mapPhoto),
      meta: {
        current_page: page,
        last_page: totalPages,
        per_page: PER_PAGE,
        total: totalResults,
        query: isCurated ? null : (params.q ?? null),
        seed: null,
      },
    };
    cache.set(key, result, CACHE_TTL, true);
    return result;
  },

  async getById(id: string): Promise<{ data: Wallpaper }> {
    const key = cacheKey("px:id", { id });
    const hit = cache.get<{ data: Wallpaper }>(key);
    if (hit) return hit;

    const photoId = id.replace("pexels-", "");
    const res = await pexelsFetch(`${BASE}/v1/photos/${photoId}`);
    if (!res.ok) throw new Error(`Pexels ${res.status}: ${res.statusText}`);

    const json = (await res.json()) as PexelsPhoto;
    const result = { data: mapPhoto(json) };
    cache.set(key, result, CACHE_TTL * 5);
    return result;
  },
};
