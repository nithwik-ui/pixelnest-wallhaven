/**
 * Pixabay provider.
 *
 * Maps Pixabay API responses to UnifiedWallpaper.
 * Proxied through /api/pixabay/* (key stays server-side).
 * API key sourced from VITE_PIXABAY_API_KEY env var on the server;
 * user can also set a custom key in Settings (passed via X-Pixabay-Key header).
 *
 * Quality defaults:
 *   • image_type = photo
 *   • orientation = horizontal (Pixabay's term for landscape)
 *   • min_width = 1920, min_height = 1080
 *   • safesearch = true
 *   • per_page = 24
 *
 * Note: largeImageURL is the best available on the free tier (~1280px).
 * Full resolution requires Pixabay Plus or download endpoint.
 */
import type { WallpaperProvider, SearchParams, SearchResponse, Wallpaper } from "./types";
import { cache, cacheKey } from "../cache";
import { getSettings } from "../storage";

const BASE = "/api/pixabay";
const CACHE_TTL = 120;
const PER_PAGE = 24;

// ─── Pixabay API Types ────────────────────────────────────────────────────────

interface PixabayHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string; // comma-separated
  previewURL: string; // ~150px
  webformatURL: string; // 640px
  largeImageURL: string; // 1280px (best free tier)
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  collections: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayResponse {
  totalHits: number;
  total: number;
  hits: PixabayHit[];
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

function parseTags(raw: string): { id: number; name: string }[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((t, i) => ({ id: i, name: t.toLowerCase() }));
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

function mapHit(hit: PixabayHit): Wallpaper {
  const w = hit.imageWidth;
  const h = hit.imageHeight;
  const res = `${w}x${h}`;

  // Pixabay's largeImageURL is the best free-tier image (~1280px wide)
  // previewURL is 150px, webformatURL is 640px
  const original = hit.largeImageURL;
  const preview = hit.largeImageURL;
  const thumbnail = hit.webformatURL;

  return {
    // ── Unified fields ──────────────────────────────────────────
    id: `pixabay-${hit.id}`,
    title: hit.tags ? `${hit.tags.split(",")[0].trim()} wallpaper` : `Pixabay ${hit.id}`,
    provider: "pixabay",
    thumbnail,
    preview,
    original,
    width: w,
    height: h,
    resolution: res,
    orientation: orient(w, h),
    category: "general",
    tags: parseTags(hit.tags ?? ""),
    author: hit.user,
    sourceUrl: hit.pageURL,
    downloadUrl: original,
    license: "CC0",
    dominantColor: "#1a1a2e", // Pixabay free API doesn't expose dominant color

    // ── Legacy compat ────────────────────────────────────────────
    url: hit.pageURL,
    short_url: hit.pageURL,
    views: hit.views,
    favorites: hit.likes,
    source: hit.pageURL,
    purity: "sfw",
    dimension_x: w,
    dimension_y: h,
    ratio: deriveRatio(w, h),
    file_size: hit.imageSize,
    file_type: "image/jpeg",
    created_at: new Date().toISOString(),
    colors: [],
    path: original,
    thumbs: {
      small: hit.previewURL,
      large: preview,
      original: original,
    },
    uploader: {
      username: hit.user,
      group: "member",
      avatar: hit.userImageURL ? { "200px": hit.userImageURL } : {},
    },
  };
}

// ─── Request helper ───────────────────────────────────────────────────────────

function pixabayFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const s = getSettings();
    if (s.pixabayApiKey?.trim()) headers["X-Pixabay-Key"] = s.pixabayApiKey.trim();
  }
  return fetch(url, { headers });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const pixabayProvider: WallpaperProvider = {
  id: "pixabay",
  name: "Pixabay",

  async search(params: SearchParams): Promise<SearchResponse> {
    const key = cacheKey("pb:search", params as Record<string, unknown>);
    const hit = cache.get<SearchResponse>(key);
    if (hit) return hit;

    const page = params.page ?? 1;
    const isCurated =
      !params.q || params.q.trim() === "" || params.q.trim().toLowerCase() === "wallpaper";

    const sp = new URLSearchParams({
      image_type: "photo",
      safesearch: "true",
      per_page: String(PER_PAGE),
      page: String(page),
      order:
        params.sorting === "views"
          ? "popular"
          : params.sorting === "date_added"
            ? "latest"
            : "popular",
    });

    if (params.orientation === "portrait") {
      sp.set("orientation", "vertical");
      sp.set("min_width", "1080");
      sp.set("min_height", "1920");
    } else if (params.orientation === "square") {
      sp.set("orientation", "vertical");
    } else if (params.orientation === "any") {
      sp.set("orientation", "all");
    } else {
      // Default to landscape
      sp.set("orientation", "horizontal");
      sp.set("min_width", "1920");
      sp.set("min_height", "1080");
    }

    if (!isCurated) {
      sp.set("q", params.q!);
    }

    const res = await pixabayFetch(`${BASE}/api/?${sp.toString()}`);

    if (!res.ok) {
      if (res.status === 400 || res.status === 401) {
        throw new Error(
          "Pixabay API key is missing or invalid. Set VITE_PIXABAY_API_KEY in your .env file.",
        );
      }
      if (res.status === 503) {
        throw new Error("Pixabay API key not configured. Add VITE_PIXABAY_API_KEY to .env");
      }
      throw new Error(`Pixabay ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as PixabayResponse;
    const totalHits = Math.min(json.totalHits, 500); // Pixabay caps at 500
    const totalPages = Math.max(1, Math.ceil(totalHits / PER_PAGE));

    const result: SearchResponse = {
      data: json.hits.map(mapHit),
      meta: {
        current_page: page,
        last_page: totalPages,
        per_page: PER_PAGE,
        total: totalHits,
        query: isCurated ? null : (params.q ?? null),
        seed: null,
      },
    };
    cache.set(key, result, CACHE_TTL, true);
    return result;
  },

  async getById(id: string): Promise<{ data: Wallpaper }> {
    const key = cacheKey("pb:id", { id });
    const hit = cache.get<{ data: Wallpaper }>(key);
    if (hit) return hit;

    const photoId = id.replace("pixabay-", "");
    const sp = new URLSearchParams({ id: photoId });
    const res = await pixabayFetch(`${BASE}/api/?${sp.toString()}`);
    if (!res.ok) throw new Error(`Pixabay ${res.status}: ${res.statusText}`);

    const json = (await res.json()) as PixabayResponse;
    const rawHit = json.hits[0];
    if (!rawHit) throw new Error("Pixabay: wallpaper not found");

    const result = { data: mapHit(rawHit) };
    cache.set(key, result, CACHE_TTL * 5);
    return result;
  },
};
