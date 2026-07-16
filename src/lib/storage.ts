import type { Wallpaper } from "./providers/types";

const FAV_KEY = "pixelnest.favorites";
const HIST_KEY = "pixelnest.history";
const DL_KEY = "pixelnest.downloads";
const SETTINGS_KEY = "pixelnest.settings";
const COLLECTIONS_KEY = "pixelnest.collections";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("pixelnest:storage", { detail: { key } }));
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export function getFavorites(): Wallpaper[] {
  return read<Wallpaper[]>(FAV_KEY, []);
}
export function isFavorite(id: string): boolean {
  return getFavorites().some((w) => w.id === id);
}
export function toggleFavorite(w: Wallpaper): boolean {
  const list = getFavorites();
  const idx = list.findIndex((x) => x.id === w.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(FAV_KEY, list);
    return false;
  }
  list.unshift(w);
  write(FAV_KEY, list);
  return true;
}
export function removeFavorite(id: string) {
  write(
    FAV_KEY,
    getFavorites().filter((w) => w.id !== id),
  );
}

// ─── History ──────────────────────────────────────────────────────────────────

export function getHistory(): Wallpaper[] {
  return read<Wallpaper[]>(HIST_KEY, []);
}
export function addToHistory(w: Wallpaper) {
  const list = getHistory().filter((x) => x.id !== w.id);
  list.unshift(w);
  write(HIST_KEY, list.slice(0, 100));
}
export function clearHistory() {
  write(HIST_KEY, []);
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export interface DownloadRecord {
  id: string;
  wallpaper: Wallpaper;
  status: "queued" | "downloading" | "completed" | "failed";
  progress: number;
  timestamp: number;
}
export function getDownloads(): DownloadRecord[] {
  return read<DownloadRecord[]>(DL_KEY, []);
}
export function addDownload(rec: DownloadRecord) {
  const list = getDownloads().filter((r) => r.id !== rec.id);
  list.unshift(rec);
  write(DL_KEY, list);
}
export function updateDownload(id: string, patch: Partial<DownloadRecord>) {
  const list = getDownloads().map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(DL_KEY, list);
}
export function removeDownload(id: string) {
  write(
    DL_KEY,
    getDownloads().filter((r) => r.id !== id),
  );
}

// ─── Collections ──────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  wallpaperIds: string[];
  /** Store the first wallpaper for thumbnail */
  cover?: Wallpaper;
}

export function getCollections(): Collection[] {
  return read<Collection[]>(COLLECTIONS_KEY, []);
}

export function createCollection(name: string): Collection {
  const col: Collection = {
    id: `col-${Date.now()}`,
    name,
    createdAt: Date.now(),
    wallpaperIds: [],
  };
  const list = getCollections();
  list.unshift(col);
  write(COLLECTIONS_KEY, list);
  return col;
}

export function addToCollection(collectionId: string, w: Wallpaper) {
  const list = getCollections().map((c) => {
    if (c.id !== collectionId) return c;
    if (c.wallpaperIds.includes(w.id)) return c;
    return {
      ...c,
      wallpaperIds: [w.id, ...c.wallpaperIds],
      cover: c.cover ?? w,
    };
  });
  write(COLLECTIONS_KEY, list);
}

export function removeFromCollection(collectionId: string, wallpaperId: string) {
  const list = getCollections().map((c) => {
    if (c.id !== collectionId) return c;
    return { ...c, wallpaperIds: c.wallpaperIds.filter((id) => id !== wallpaperId) };
  });
  write(COLLECTIONS_KEY, list);
}

export function deleteCollection(id: string) {
  write(
    COLLECTIONS_KEY,
    getCollections().filter((c) => c.id !== id),
  );
}

export function renameCollection(id: string, name: string) {
  const list = getCollections().map((c) => (c.id === id ? { ...c, name } : c));
  write(COLLECTIONS_KEY, list);
}

export function isInCollection(collectionId: string, wallpaperId: string): boolean {
  return (
    getCollections()
      .find((c) => c.id === collectionId)
      ?.wallpaperIds.includes(wallpaperId) ?? false
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: "light" | "dark";
  quality: "thumb" | "original";
  downloadFolder: string;
  autoRefresh: boolean;
  /** Wallhaven API key — optional, raises rate limits */
  wallhavenApiKey?: string;
  /** Pexels API key — required for Pexels results */
  pexelsApiKey?: string;
  /** Pixabay API key — required for Pixabay results */
  pixabayApiKey?: string;
  /** Default provider used when provider is not specified */
  defaultProvider: "wallhaven" | "pexels" | "pixabay" | "all";
  /** Which providers are currently enabled (persisted) */
  enabledProviders?: ("wallhaven" | "pexels" | "pixabay")[];
}

const defaultSettings: AppSettings = {
  theme: "light",
  quality: "original",
  downloadFolder: "Pictures/PixelNest",
  autoRefresh: false,
  defaultProvider: "all",
  enabledProviders: ["wallhaven", "pexels", "pixabay"],
};

export function getSettings(): AppSettings {
  return { ...defaultSettings, ...read<Partial<AppSettings>>(SETTINGS_KEY, {}) };
}
export function saveSettings(s: Partial<AppSettings>) {
  write(SETTINGS_KEY, { ...getSettings(), ...s });
}

// ─── Storage stats ─────────────────────────────────────────────────────────────

export function getStorageStats() {
  const downloads = getDownloads();
  const favorites = getFavorites();
  const history = getHistory();
  const collections = getCollections();

  // Estimate storage used from download sizes
  const storageBytes = downloads
    .filter((d) => d.status === "completed")
    .reduce((acc, d) => acc + (d.wallpaper.file_size ?? 0), 0);

  return {
    downloadCount: downloads.filter((d) => d.status === "completed").length,
    favoriteCount: favorites.length,
    historyCount: history.length,
    collectionCount: collections.length,
    storageBytes,
    storageMB: (storageBytes / 1024 / 1024).toFixed(1),
  };
}
