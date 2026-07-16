import type { Wallpaper } from "./wallhaven";

const FAV_KEY = "pixelnest.favorites";
const HIST_KEY = "pixelnest.history";
const DL_KEY = "pixelnest.downloads";
const SETTINGS_KEY = "pixelnest.settings";

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

export interface AppSettings {
  theme: "light" | "dark";
  quality: "thumb" | "original";
  downloadFolder: string;
  autoRefresh: boolean;
}
const defaultSettings: AppSettings = {
  theme: "light",
  quality: "original",
  downloadFolder: "Pictures/PixelNest",
  autoRefresh: false,
};
export function getSettings(): AppSettings {
  return { ...defaultSettings, ...read<Partial<AppSettings>>(SETTINGS_KEY, {}) };
}
export function saveSettings(s: Partial<AppSettings>) {
  write(SETTINGS_KEY, { ...getSettings(), ...s });
}
