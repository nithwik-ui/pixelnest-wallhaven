/**
 * Provider registry — thin re-export layer.
 *
 * All application code should import from this file (not from the individual
 * provider modules or manager directly). This keeps import paths stable as
 * the architecture evolves.
 */

export { providerManager, searchProviders, getWallpaperById } from "./manager";
export { wallhavenProvider } from "./wallhaven";
export { pexelsProvider } from "./pexels";
export { pixabayProvider } from "./pixabay";
export { nasaProvider } from "./nasa";
export type {
  WallpaperProvider,
  SearchParams,
  SearchResponse,
  Wallpaper,
  ProviderName,
  ProviderStatus,
  UnifiedWallpaper,
} from "./types";
