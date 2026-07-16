export interface Wallpaper {
  id: string;
  url: string;
  short_url: string;
  views: number;
  favorites: number;
  source: string;
  purity: string;
  category: string;
  dimension_x: number;
  dimension_y: number;
  resolution: string;
  ratio: string;
  file_size: number;
  file_type: string;
  created_at: string;
  colors: string[];
  path: string;
  thumbs: { large: string; original: string; small: string };
  uploader?: { username: string; group: string; avatar: Record<string, string> };
  tags?: { id: number; name: string }[];
}

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
}

export interface SearchParams {
  q?: string;
  categories?: string; // 3-bit: general/anime/people e.g. "111"
  purity?: string; // 3-bit: sfw/sketchy/nsfw e.g. "100"
  sorting?: "date_added" | "relevance" | "random" | "views" | "favorites" | "toplist" | "hot";
  order?: "desc" | "asc";
  topRange?: "1d" | "3d" | "1w" | "1M" | "3M" | "6M" | "1y";
  atleast?: string; // e.g. "1920x1080"
  resolutions?: string; // comma
  ratios?: string; // "landscape" | "portrait" | "square" | comma of ratios
  colors?: string; // hex without #
  page?: number;
  seed?: string;
}

const BASE = "/api/wallhaven";

export function buildQuery(params: SearchParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function searchWallpapers(params: SearchParams = {}): Promise<SearchResponse> {
  const res = await fetch(`${BASE}/search${buildQuery(params)}`);
  if (!res.ok) throw new Error(`Wallhaven search failed: ${res.status}`);
  return res.json();
}

export async function getWallpaper(id: string): Promise<{ data: Wallpaper }> {
  const res = await fetch(`${BASE}/w/${id}`);
  if (!res.ok) throw new Error(`Wallhaven fetch failed: ${res.status}`);
  return res.json();
}

export const POPULAR_COLORS = [
  "660000", "990000", "cc0000", "cc3333", "ea4c88",
  "993399", "663399", "333399", "0066cc", "0099cc",
  "66cccc", "77cc33", "669900", "336600", "666600",
  "999900", "cccc33", "ffff00", "ffcc33", "ff9900",
  "ff6600", "cc6633", "996633", "663300", "000000",
  "999999", "cccccc", "ffffff", "424153",
];

export const CATEGORY_PRESETS: Array<{ label: string; q: string; color: string }> = [
  { label: "Nature", q: "nature landscape", color: "#4ade80" },
  { label: "Space", q: "space galaxy stars", color: "#818cf8" },
  { label: "Abstract", q: "abstract", color: "#f472b6" },
  { label: "Minimal", q: "minimal minimalist", color: "#94a3b8" },
  { label: "City", q: "city cityscape", color: "#fbbf24" },
  { label: "Anime", q: "anime", color: "#f87171" },
  { label: "Cars", q: "cars automotive", color: "#60a5fa" },
  { label: "Dark", q: "dark", color: "#1f2937" },
  { label: "Mountains", q: "mountains", color: "#6b7280" },
  { label: "Ocean", q: "ocean sea", color: "#0ea5e9" },
  { label: "Neon", q: "neon cyberpunk", color: "#a855f7" },
  { label: "Animals", q: "animals wildlife", color: "#d97706" },
];
