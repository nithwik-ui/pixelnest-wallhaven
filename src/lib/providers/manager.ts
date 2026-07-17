/**
 * ProviderManager — the central orchestrator for all wallpaper providers.
 *
 * Responsibilities:
 *   • Maintain enabled/disabled state per provider
 *   • Search one or all providers in parallel
 *   • Merge and deduplicate results
 *   • Isolate provider failures (one failure doesn't break others)
 *   • Retry with exponential back-off
 *   • Test provider connections
 *   • Report per-provider status to the Settings page
 *
 * Adding a future provider (NASA, Bing, Unsplash…) requires:
 *   1. Create src/lib/providers/<name>.ts implementing WallpaperProvider
 *   2. Add one line to PROVIDER_REGISTRY below
 *   Nothing else needs to change.
 */

import type {
  WallpaperProvider,
  SearchParams,
  SearchResponse,
  Wallpaper,
  ProviderName,
  ProviderStatus,
} from "./types";
import { wallhavenProvider } from "./wallhaven";
import { pexelsProvider } from "./pexels";
import { pixabayProvider } from "./pixabay";
import { nasaProvider } from "./nasa";
import { getSettings, saveSettings } from "../storage";

// ─── Registry — add future providers here ─────────────────────────────────────

const PROVIDER_REGISTRY: WallpaperProvider[] = [
  wallhavenProvider,
  pexelsProvider,
  pixabayProvider,
  nasaProvider,
];

// ─── Retry utility ────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 800;
const TIMEOUT_MS = 12_000;

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = BASE_DELAY_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fn();
  } catch (err) {
    clearTimeout(timeout);
    if (retries > 0 && !(err instanceof DOMException && err.name === "AbortError")) {
      await new Promise((r) => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Manager class ────────────────────────────────────────────────────────────

class ProviderManager {
  /**
   * Which providers are currently enabled.
   * Persisted to localStorage so the user's preference survives refresh.
   */
  private get enabledIds(): Set<ProviderName> {
    const s = getSettings();
    return new Set(s.enabledProviders ?? ["wallhaven", "pexels", "pixabay", "nasa"]);
  }

  private set enabledIds(ids: Set<ProviderName>) {
    saveSettings({ enabledProviders: [...ids] as ProviderName[] });
  }

  // ── Provider access ─────────────────────────────────────────────────────────

  getAll(): WallpaperProvider[] {
    return PROVIDER_REGISTRY;
  }

  getEnabled(): WallpaperProvider[] {
    const enabled = this.enabledIds;
    return PROVIDER_REGISTRY.filter((p) => enabled.has(p.id));
  }

  get(id: ProviderName): WallpaperProvider | undefined {
    return PROVIDER_REGISTRY.find((p) => p.id === id);
  }

  isEnabled(id: ProviderName): boolean {
    return this.enabledIds.has(id);
  }

  enable(id: ProviderName): void {
    const ids = this.enabledIds;
    ids.add(id);
    this.enabledIds = ids;
  }

  disable(id: ProviderName): void {
    const ids = this.enabledIds;
    ids.delete(id);
    this.enabledIds = ids;
  }

  toggle(id: ProviderName): boolean {
    if (this.isEnabled(id)) {
      this.disable(id);
      return false;
    }
    this.enable(id);
    return true;
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Search wallpapers.
   *
   * - provider = "all"     → parallel search across all enabled providers
   * - provider = <name>    → single provider (must be enabled)
   * - provider = undefined → use the user's default provider from settings
   *
   * Results are deduplicated by ID and merged into one list.
   * Provider failures are isolated — errors from one provider never
   * prevent results from healthy providers from being returned.
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const target = params.provider ?? getSettings().defaultProvider ?? "all";

    if (target === "all") {
      return this._searchAll(params);
    }

    // Single provider with fallback
    const provider = this.get(target as ProviderName);
    let response: SearchResponse | null = null;
    if (provider && this.isEnabled(provider.id)) {
      try {
        response = await withRetry(() => provider.search(params));
      } catch (err) {
        console.error(`Provider ${target} failed:`, err);
      }
    }

    // Fallback logic: if provider failed or returned no results, try other enabled providers
    if (!response || response.data.length === 0) {
      const fallbackProviders = this.getEnabled().filter((p) => p.id !== target);
      for (const p of fallbackProviders) {
        try {
          const fallbackRes = await withRetry(() => p.search(params));
          if (fallbackRes.data.length > 0) {
            return fallbackRes;
          }
        } catch (err) {
          console.error(`Fallback provider ${p.id} failed:`, err);
        }
      }
    }

    return response ?? this._emptyResponse(params, "No results");
  }

  private async _searchAll(params: SearchParams): Promise<SearchResponse> {
    const providers = this.getEnabled();
    if (providers.length === 0) {
      return this._emptyResponse(params, "No providers enabled.");
    }

    const tasks = providers.map((p) =>
      withRetry(() => p.search(params))
        .then((r) => ({ ok: true as const, provider: p.id, result: r }))
        .catch((err) => ({ ok: false as const, provider: p.id, error: String(err) })),
    );

    const settled = await Promise.all(tasks);

    const merged: Wallpaper[] = [];
    const seen: Set<string> = new Set();
    const seenSignatures: Set<string> = new Set();
    const errors: Record<string, string> = {};
    let total = 0;
    let lastPage = 1;

    for (const item of settled) {
      if (!item.ok) {
        errors[item.provider] = item.error;
        continue;
      }
      for (const w of item.result.data) {
        const filename = w.downloadUrl ? w.downloadUrl.split("?")[0].split("/").pop() : "";
        const signature = `${w.width}x${w.height}_${filename}`;

        if (!seen.has(w.id) && (!filename || !seenSignatures.has(signature))) {
          seen.add(w.id);
          if (filename) seenSignatures.add(signature);
          merged.push(w);
        }
      }
      total += item.result.meta.total;
      lastPage = Math.max(lastPage, item.result.meta.last_page);
    }

    return {
      data: merged,
      meta: {
        current_page: params.page ?? 1,
        last_page: lastPage,
        per_page: merged.length,
        total,
        query: params.q ?? null,
        seed: null,
      },
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  private _emptyResponse(params: SearchParams, _reason?: string): SearchResponse {
    return {
      data: [],
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 0,
        total: 0,
        query: params.q ?? null,
        seed: null,
      },
    };
  }

  // ── Get by ID ───────────────────────────────────────────────────────────────

  /**
   * Detect provider from the wallpaper ID prefix and fetch from the right provider.
   *   "pexels-*"   → Pexels
   *   "pixabay-*"  → Pixabay
   *   anything else → Wallhaven
   */
  async getById(id: string): Promise<{ data: Wallpaper }> {
    if (id.startsWith("pexels-")) return withRetry(() => pexelsProvider.getById(id));
    if (id.startsWith("pixabay-")) return withRetry(() => pixabayProvider.getById(id));
    return withRetry(() => wallhavenProvider.getById(id));
  }

  // ── Provider status & testing ───────────────────────────────────────────────

  /**
   * Test connectivity to a single provider.
   * Performs a minimal 1-result search and reports latency.
   */
  async testConnection(
    id: ProviderName,
  ): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    const provider = this.get(id);
    if (!provider) return { ok: false, message: `Unknown provider: ${id}` };

    const t0 = Date.now();
    try {
      const res = await provider.search({ q: "landscape", page: 1 });
      const ms = Date.now() - t0;
      if (res.data.length === 0) {
        return { ok: false, message: "Connected but returned no results", latencyMs: ms };
      }
      return { ok: true, message: `Connected — ${ms}ms`, latencyMs: ms };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Aggregate status for the Settings page.
   */
  getStatus(): ProviderStatus[] {
    const s = getSettings();
    const keyMap: Record<string, string | undefined> = {
      wallhaven: s.wallhavenApiKey,
      pexels: s.pexelsApiKey,
      pixabay: s.pixabayApiKey,
    };
    return PROVIDER_REGISTRY.map((p) => ({
      id: p.id,
      name: p.name,
      enabled: this.isEnabled(p.id),
      connected: null,
      hasApiKey: !!(keyMap[p.id]?.trim() || this._envKeyPresent(p.id)),
    }));
  }

  private _envKeyPresent(id: ProviderName): boolean {
    // Check if env var is set (only reliable on the client with VITE_ prefix)
    if (typeof import.meta !== "undefined") {
      const env = import.meta.env as Record<string, string | undefined>;
      const map: Record<string, string> = {
        wallhaven: "VITE_WALLHAVEN_API_KEY",
        pexels: "VITE_PEXELS_API_KEY",
        pixabay: "VITE_PIXABAY_API_KEY",
      };
      return !!env[map[id]];
    }
    return false;
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

/** Use this singleton throughout the app — never instantiate ProviderManager directly. */
export const providerManager = new ProviderManager();

// ─── Convenience re-exports (keep existing call sites working) ─────────────────

export function searchProviders(params: SearchParams): Promise<SearchResponse> {
  return providerManager.search(params);
}

export function getWallpaperById(id: string): Promise<{ data: Wallpaper }> {
  return providerManager.getById(id);
}
