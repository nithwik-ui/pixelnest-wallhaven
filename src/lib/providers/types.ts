/**
 * UnifiedWallpaper — the canonical data model for PexelNest.
 *
 * Every provider (Wallhaven, Pexels, Pixabay, future providers) MUST map
 * their API responses to this type. UI components only consume this type.
 *
 * Fields are split into two sections:
 *   1. Unified spec fields — clean, provider-agnostic (for new code)
 *   2. Legacy compatibility fields — used by existing UI components
 *      (do NOT remove; components reference these directly)
 */

// ─── Unified Spec Fields ──────────────────────────────────────────────────────

export type ProviderName = "wallhaven" | "pexels" | "pixabay" | "nasa";
export type Orientation = "landscape" | "portrait" | "square";

export interface UnifiedWallpaper {
  // Unified Model
  id: string;
  title: string;
  provider: ProviderName;
  thumbnail: string; // small – card display (~400px)
  preview: string; // medium – modal preview (~1280px)
  original: string; // full resolution URL
  width: number;
  height: number;
  resolution: string; // "1920x1080"
  orientation: Orientation;
  category: string;
  tags: { id: number; name: string }[]; // component-compat format
  author: string;
  sourceUrl: string; // link to source page
  downloadUrl: string; // direct image URL for download
  license: string; // "CC0" | "Pexels" | "Pixabay" | "Wallhaven"
  dominantColor: string; // hex e.g. "#1a2b3c"

  // Legacy Compatibility (UI components reference these directly)
  url: string; // alias → sourceUrl
  short_url: string;
  views: number;
  favorites: number;
  source: string;
  purity: string;
  dimension_x: number; // alias → width
  dimension_y: number; // alias → height
  ratio: string; // e.g. "16:9"
  file_size: number;
  file_type: string;
  created_at: string;
  colors: string[];
  path: string; // alias → original / downloadUrl
  thumbs: {
    large: string; // alias → preview
    original: string; // alias → original
    small: string; // alias → thumbnail
  };
  uploader?: { username: string; group: string; avatar: Record<string, string> };
  photographer?: string;
  photographer_url?: string;
}

/** Backward-compat alias — all existing code uses `Wallpaper` */
export type Wallpaper = UnifiedWallpaper;

// ─── Search & Provider Interfaces ─────────────────────────────────────────────

export interface SearchMeta {
  current_page: number;
  last_page: number;
  per_page: number | string;
  total: number;
  query: string | null;
  seed: string | null;
}

export interface SearchResponse {
  data: Wallpaper[];
  meta: SearchMeta;
  /** Errors from providers that partially failed */
  errors?: Record<string, string>;
}

export interface SearchParams {
  q?: string;
  categories?: string; // Wallhaven 3-bit bitmask
  purity?: string; // Wallhaven purity bitmask
  sorting?: "date_added" | "relevance" | "random" | "views" | "favorites" | "toplist" | "hot";
  order?: "desc" | "asc";
  topRange?: "1d" | "3d" | "1w" | "1M" | "3M" | "6M" | "1y";
  atleast?: string; // e.g. "1920x1080"
  resolutions?: string;
  ratios?: string;
  colors?: string; // hex without #
  page?: number;
  seed?: string;
  orientation?: "landscape" | "portrait" | "square" | "any";
  /** Which provider(s) to query — "all" searches every enabled provider */
  provider?: ProviderName | "all";
}

/**
 * Contract every provider module must implement.
 * Adding a new provider = create one file implementing this interface.
 */
export interface WallpaperProvider {
  id: ProviderName;
  name: string;
  /**
   * Search wallpapers. Should never throw — return empty data on error.
   * The manager wraps calls with retry logic.
   */
  search(params: SearchParams): Promise<SearchResponse>;
  /** Get a single wallpaper by its provider-specific ID. */
  getById(id: string): Promise<{ data: Wallpaper }>;
}

// ─── Provider Manager State ────────────────────────────────────────────────────

export interface ProviderStatus {
  id: ProviderName;
  name: string;
  enabled: boolean;
  connected: boolean | null; // null = untested
  lastError?: string;
  lastTested?: number;
  hasApiKey: boolean;
}
