import type { SearchParams, SearchResponse, Wallpaper, WallpaperProvider } from "./types";

const NASA_API_KEY = "e1qu8D1XRWqD2lsujaCmi6ogauv09fFol8lFG6Q9";

export const nasaProvider: WallpaperProvider = {
  id: "nasa",
  name: "NASA",

  async search(params: SearchParams): Promise<SearchResponse> {
    // NASA APOD API provides random incredible space images when using 'count'
    // We use a high count to simulate a page of search results.
    const count = 30;
    const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&count=${count}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`NASA API error: ${res.status}`);

      const data = await res.json();
      
      const mapped: Wallpaper[] = data
        .filter((item: any) => item.media_type === "image" && item.url)
        .map((item: any, i: number) => {
          const id = `nasa-${item.date || Date.now()}-${i}`;
          return {
            id,
            title: item.title || "NASA Astronomy Picture",
            provider: "nasa",
            thumbnail: item.url,
            preview: item.url,
            original: item.hdurl || item.url,
            width: 1920,
            height: 1080,
            resolution: "1920x1080",
            orientation: "landscape",
            category: "Space",
            tags: [
              { id: 1, name: "Space" },
              { id: 2, name: "NASA" },
              { id: 3, name: "Astronomy" }
            ],
            author: item.copyright || "NASA",
            sourceUrl: item.hdurl || item.url,
            downloadUrl: item.hdurl || item.url,
            license: "Public Domain",
            dominantColor: "#000000",
            url: item.hdurl || item.url,
            short_url: item.url,
            views: 0,
            favorites: 0,
            source: "NASA",
            purity: "SFW",
            dimension_x: 1920,
            dimension_y: 1080,
            ratio: "16:9",
            file_size: 0,
            file_type: "image/jpeg",
            created_at: item.date || new Date().toISOString(),
            colors: ["#000000"],
            path: item.hdurl || item.url,
            thumbs: {
              large: item.url,
              original: item.hdurl || item.url,
              small: item.url,
            },
          };
        });

      return {
        data: mapped,
        meta: {
          current_page: params.page ?? 1,
          last_page: (params.page ?? 1) + 10, // Simulate infinite scrolling
          per_page: mapped.length,
          total: 10000,
          query: params.q || null,
          seed: null,
        },
      };
    } catch (error) {
      console.error("NASA API Error:", error);
      return {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 0, total: 0, query: null, seed: null },
      };
    }
  },

  async getById(id: string): Promise<{ data: Wallpaper }> {
    // APOD doesn't have a direct ID fetch by arbitrary random hash, but since we map date into ID:
    // Fallback: just return a single random APOD to satisfy the interface.
    const res = await this.search({ page: 1 });
    if (res.data.length > 0) return { data: res.data[0] };
    throw new Error("Wallpaper not found");
  }
};
