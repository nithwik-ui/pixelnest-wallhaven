/**
 * wallhaven.ts — Re-exports the shared Wallpaper type from providers/types
 * and keeps all existing exports for backward compatibility.
 * New code should import from @/lib/providers/* directly.
 */
export type { Wallpaper, SearchMeta, SearchResponse, SearchParams } from "./providers/types";

// Re-export provider functions under the existing API surface
export { searchProviders as searchWallpapers } from "./providers/registry";
export { getWallpaperById as getWallpaper } from "./providers/registry";
export { wallhavenProvider } from "./providers/wallhaven";

export const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const POPULAR_COLORS = [
  "660000",
  "990000",
  "cc0000",
  "cc3333",
  "ea4c88",
  "993399",
  "663399",
  "333399",
  "0066cc",
  "0099cc",
  "66cccc",
  "77cc33",
  "669900",
  "336600",
  "666600",
  "999900",
  "cccc33",
  "ffff00",
  "ffcc33",
  "ff9900",
  "ff6600",
  "cc6633",
  "996633",
  "663300",
  "000000",
  "999999",
  "cccccc",
  "ffffff",
  "424153",
];

export type CategoryPreset = {
  label: string;
  q: string;
  color: string;
  icon: string;
  atleast?: string;
  orientation?: "landscape" | "portrait" | "square";
  description: string;
};

export const CATEGORY_PRESETS: CategoryPreset[] = [
  // Resolution/Formats
  {
    label: "4K",
    q: "",
    color: "#6366f1",
    icon: "Monitor",
    atleast: "3840x2160",
    description: "Ultra HD 4K wallpapers",
  },
  {
    label: "5K",
    q: "",
    color: "#8b5cf6",
    icon: "Monitor",
    atleast: "5120x2880",
    description: "Stunning 5K resolution",
  },
  {
    label: "8K",
    q: "",
    color: "#a855f7",
    icon: "Monitor",
    atleast: "7680x4320",
    description: "Breathtaking 8K quality",
  },
  {
    label: "Ultra HD",
    q: "",
    color: "#4f46e5",
    icon: "MonitorPlay",
    atleast: "3840x2160",
    description: "Crisp Ultra HD quality",
  },
  {
    label: "Portrait",
    q: "",
    color: "#ec4899",
    icon: "Smartphone",
    orientation: "portrait",
    description: "Vertical mobile wallpapers",
  },
  {
    label: "Macro",
    q: "macro",
    color: "#14b8a6",
    icon: "Camera",
    description: "Extreme close-up details",
  },

  // Nature & Landscapes
  {
    label: "Nature",
    q: "nature",
    color: "#4ade80",
    icon: "Trees",
    description: "Natural scenes & landscapes",
  },
  {
    label: "Mountains",
    q: "mountains",
    color: "#6b7280",
    icon: "Mountain",
    description: "Majestic peaks and ranges",
  },
  {
    label: "Forest",
    q: "forest",
    color: "#16a34a",
    icon: "TreePine",
    description: "Lush forests and woodlands",
  },
  {
    label: "Beach",
    q: "beach",
    color: "#0ea5e9",
    icon: "Waves",
    description: "Tropical beaches & coastlines",
  },
  {
    label: "Ocean",
    q: "ocean",
    color: "#06b6d4",
    icon: "Waves",
    description: "Deep oceans and seascapes",
  },
  {
    label: "Sunset",
    q: "sunset",
    color: "#f97316",
    icon: "Sunset",
    description: "Beautiful twilight colors",
  },
  {
    label: "Sunrise",
    q: "sunrise",
    color: "#eab308",
    icon: "Sunrise",
    description: "Warm glow of early morning",
  },
  {
    label: "River",
    q: "river",
    color: "#3b82f6",
    icon: "Waves",
    description: "Flowing rivers and streams",
  },
  {
    label: "Waterfall",
    q: "waterfall",
    color: "#2563eb",
    icon: "Droplet",
    description: "Stunning cascading waterfalls",
  },

  // Seasons
  {
    label: "Winter",
    q: "winter",
    color: "#bae6fd",
    icon: "Snowflake",
    description: "Snow-covered winter scenes",
  },
  {
    label: "Autumn",
    q: "autumn",
    color: "#ca8a04",
    icon: "Leaf",
    description: "Golden fall foliage",
  },
  {
    label: "Spring",
    q: "spring",
    color: "#22c55e",
    icon: "Sprout",
    description: "Fresh spring blooms & greens",
  },
  {
    label: "Summer",
    q: "summer",
    color: "#fbbf24",
    icon: "Sun",
    description: "Bright and sunny summer vibes",
  },

  // Space & Cosmos
  {
    label: "Space",
    q: "space",
    color: "#818cf8",
    icon: "Star",
    description: "Outer space exploration",
  },
  {
    label: "Galaxy",
    q: "galaxy",
    color: "#a855f7",
    icon: "Sparkles",
    description: "Deep space nebulae and galaxies",
  },
  {
    label: "Earth",
    q: "earth",
    color: "#10b981",
    icon: "Globe",
    description: "Stunning views of planet Earth",
  },
  {
    label: "Space Art",
    q: "space art",
    color: "#6366f1",
    icon: "Star",
    description: "Cosmic digital illustrations",
  },

  // Architecture & Cities
  {
    label: "City",
    q: "city",
    color: "#fbbf24",
    icon: "Building2",
    description: "Urban skylines and cityscapes",
  },
  {
    label: "Architecture",
    q: "architecture",
    color: "#d97706",
    icon: "Landmark",
    description: "Sleek architectural details",
  },

  // Art & Style
  {
    label: "Minimal",
    q: "minimal",
    color: "#94a3b8",
    icon: "Minus",
    description: "Clean & simple minimalist wallpapers",
  },
  {
    label: "Abstract",
    q: "abstract",
    color: "#f472b6",
    icon: "Layers",
    description: "Abstract patterns and designs",
  },
  {
    label: "Dark",
    q: "dark",
    color: "#1f2937",
    icon: "Moon",
    description: "Dark and moody atmospheres",
  },
  {
    label: "Black",
    q: "black",
    color: "#0f172a",
    icon: "Circle",
    description: "Deep dark wallpapers",
  },
  {
    label: "White",
    q: "white",
    color: "#f1f5f9",
    icon: "Sun",
    description: "Bright & clean white backgrounds",
  },
  {
    label: "AMOLED",
    q: "amoled",
    color: "#000000",
    icon: "Circle",
    description: "Pure black AMOLED-friendly art",
  },
  {
    label: "Cyberpunk",
    q: "cyberpunk",
    color: "#a855f7",
    icon: "Zap",
    description: "Neon-lit cyberpunk vibes",
  },
  {
    label: "Neon",
    q: "neon",
    color: "#ec4899",
    icon: "Lightbulb",
    description: "Vibrant neon glowing designs",
  },

  // Vehicles
  {
    label: "Cars",
    q: "cars",
    color: "#3b82f6",
    icon: "Car",
    description: "Beautiful automotive photography",
  },
  {
    label: "Bikes",
    q: "motorcycle",
    color: "#ef4444",
    icon: "Bike",
    description: "Motorcycles and superbikes",
  },
  {
    label: "Supercars",
    q: "supercar",
    color: "#f97316",
    icon: "Car",
    description: "Exotic high-performance supercars",
  },

  // Entertainment & Tech
  {
    label: "Anime",
    q: "anime",
    color: "#fb923c",
    icon: "Tv",
    description: "Beautiful anime artwork",
  },
  {
    label: "Gaming",
    q: "gaming",
    color: "#f87171",
    icon: "Gamepad2",
    description: "Console, PC & game wallpapers",
  },
  {
    label: "Technology",
    q: "technology",
    color: "#60a5fa",
    icon: "Cpu",
    description: "Futuristic digital tech",
  },
  {
    label: "AI",
    q: "ai",
    color: "#8b5cf6",
    icon: "Brain",
    description: "AI-generated digital artwork",
  },
  {
    label: "Programming",
    q: "programming",
    color: "#10b981",
    icon: "Code",
    description: "Developer and code theme art",
  },

  // Flora & Fauna
  {
    label: "Flowers",
    q: "flowers",
    color: "#f472b6",
    icon: "Flower2",
    description: "Beautiful floral photography",
  },
  {
    label: "Animals",
    q: "animals",
    color: "#ca8a04",
    icon: "PawPrint",
    description: "Wild creatures & animals",
  },
  {
    label: "Birds",
    q: "birds",
    color: "#06b6d4",
    icon: "Bird",
    description: "Stunning birds and flight",
  },
  {
    label: "Dogs",
    q: "dogs",
    color: "#b45309",
    icon: "PawPrint",
    description: "Man's best friend",
  },
  {
    label: "Cats",
    q: "cats",
    color: "#475569",
    icon: "PawPrint",
    description: "Playful cats and kittens",
  },

  // Fiction
  {
    label: "Fantasy",
    q: "fantasy",
    color: "#ec4899",
    icon: "Wand",
    description: "Enchanted worlds & fantasy art",
  },
  {
    label: "Sci-Fi",
    q: "scifi",
    color: "#2563eb",
    icon: "Rocket",
    description: "Science fiction and future concepts",
  },
];
