/**
 * Wallhaven provider.
 *
 * Maps Wallhaven API responses to the UnifiedWallpaper model.
 * All requests are proxied through /api/wallhaven/* to avoid CORS.
 * API key is read from env on the server; the client can override via
 * the X-Wallhaven-Key header (set from Settings → localStorage key).
 *
 * Defaults applied automatically:
 *   • SFW only (purity=100)
 *   • General + Anime, no People (categories=110)
 *   • Minimum 1920×1080 (atleast=1920x1080)
 *   • Landscape only (ratios=landscape)
 */
import type { WallpaperProvider, SearchParams, SearchResponse, Wallpaper } from "./types";
import { cache, cacheKey } from "../cache";
import { getSettings } from "../storage";

const BASE = "/api/wallhaven";
const CACHE_TTL = 120; // seconds
const PER_PAGE = 24;

// ─── Smart Defaults ───────────────────────────────────────────────────────────

const DEFAULTS: Partial<SearchParams> = {
  purity: "100", // SFW only
  categories: "110", // General + Anime, exclude People
  atleast: "1920x1080", // Minimum full-HD
  ratios: "landscape", // Landscape only
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function deriveRatio(w: number, h: number): string {
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function orientation(w: number, h: number) {
  if (w > h) return "landscape" as const;
  if (h > w) return "portrait" as const;
  return "square" as const;
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawWallhaven = any;

function mapWallpaper(raw: RawWallhaven): Wallpaper {
  const w = raw.dimension_x ?? 0;
  const h = raw.dimension_y ?? 0;
  const res = raw.resolution ?? `${w}x${h}`;

  return {
    // ── Unified fields ──────────────────────────────────────────
    id: String(raw.id),
    title: raw.uploader?.username ? `Wallpaper by ${raw.uploader.username}` : `Wallhaven ${raw.id}`,
    provider: "wallhaven",
    thumbnail: raw.thumbs?.small ?? raw.thumbs?.large ?? "",
    preview: raw.thumbs?.large ?? "",
    original: raw.path ?? "",
    width: w,
    height: h,
    resolution: res,
    orientation: orientation(w, h),
    category: raw.category ?? "general",
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name }))
      : [],
    author: raw.uploader?.username ?? "Unknown",
    sourceUrl: raw.url ?? raw.short_url ?? "",
    downloadUrl: raw.path ?? "",
    license: "Wallhaven",
    dominantColor: Array.isArray(raw.colors) && raw.colors.length > 0 ? raw.colors[0] : "#1a1a2e",

    // ── Legacy compat ────────────────────────────────────────────
    url: raw.url ?? "",
    short_url: raw.short_url ?? "",
    views: raw.views ?? 0,
    favorites: raw.favorites ?? 0,
    source: raw.url ?? "",
    purity: raw.purity ?? "sfw",
    dimension_x: w,
    dimension_y: h,
    ratio: raw.ratio ?? deriveRatio(w, h),
    file_size: raw.file_size ?? 0,
    file_type: raw.file_type ?? "image/jpeg",
    created_at: raw.created_at ?? new Date().toISOString(),
    colors: Array.isArray(raw.colors) ? raw.colors : [],
    path: raw.path ?? "",
    thumbs: {
      small: raw.thumbs?.small ?? "",
      large: raw.thumbs?.large ?? "",
      original: raw.thumbs?.original ?? raw.path ?? "",
    },
    uploader: raw.uploader,
    photographer: undefined,
    photographer_url: undefined,
  };
}

// ─── Request helper with API key header ───────────────────────────────────────

function wallhavenFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = { "User-Agent": "PexelNest/1.0" };
  // Pass user's key from settings as a header to the proxy
  if (typeof window !== "undefined") {
    const s = getSettings();
    if (s.wallhavenApiKey?.trim()) headers["X-Wallhaven-Key"] = s.wallhavenApiKey.trim();
  }
  return fetch(url, { headers });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const wallhavenProvider: WallpaperProvider = {
  id: "wallhaven",
  name: "Wallhaven",

  async search(params: SearchParams): Promise<SearchResponse> {
    const key = cacheKey("wh:search", params as Record<string, unknown>);
    const hit = cache.get<SearchResponse>(key);
    if (hit) return hit;

    // Merge defaults; caller values override
    const { provider: _p, orientation: _o, ...rest } = params;
    void _p;
    void _o;
    const merged = { ...DEFAULTS, ...rest, per_page: PER_PAGE };

    if (params.orientation === "portrait") {
      merged.ratios = "portrait";
      if (merged.atleast === "1920x1080") {
        merged.atleast = "1080x1920";
      }
    } else if (params.orientation === "square") {
      merged.ratios = "square";
      if (merged.atleast === "1920x1080") {
        merged.atleast = undefined;
      }
    } else if (params.orientation === "any") {
      merged.ratios = undefined;
      merged.atleast = undefined;
    } else {
      merged.ratios = "landscape";
    }

    const res = await wallhavenFetch(
      `${BASE}/search${qs(merged as Record<string, string | number | undefined>)}`,
    );
    if (!res.ok) throw new Error(`Wallhaven ${res.status}: ${res.statusText}`);

    const json = (await res.json()) as { data: RawWallhaven[]; meta: SearchResponse["meta"] };
    const result: SearchResponse = {
      data: json.data.map(mapWallpaper),
      meta: json.meta,
    };
    cache.set(key, result, CACHE_TTL);
    return result;
  },

  async getById(id: string): Promise<{ data: Wallpaper }> {
    const key = cacheKey("wh:id", { id });
    const hit = cache.get<{ data: Wallpaper }>(key);
    if (hit) return hit;

    const res = await wallhavenFetch(`${BASE}/w/${id}`);
    if (!res.ok) throw new Error(`Wallhaven ${res.status}: ${res.statusText}`);

    const json = (await res.json()) as { data: RawWallhaven };
    const result = { data: mapWallpaper(json.data) };
    cache.set(key, result, CACHE_TTL * 5);
    return result;
  },
};
