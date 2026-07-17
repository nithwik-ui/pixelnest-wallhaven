import { createFileRoute } from "@tanstack/react-router";

/**
 * Wallhaven API proxy.
 *
 * Proxies requests to wallhaven.cc/api/v1/* to bypass CORS.
 * Reads API key from:
 *   1. X-Wallhaven-Key request header (user-configured key from Settings)
 *   2. VITE_WALLHAVEN_API_KEY environment variable
 *
 * Usage: GET /api/wallhaven/search?q=landscape
 *        GET /api/wallhaven/w/:id
 */
export const Route = createFileRoute("/api/wallhaven/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params as { _splat?: string })._splat ?? "";
        const apiKey = process.env.VITE_WALLHAVEN_API_KEY ?? "";

        // Append API key to the request if available
        if (apiKey) url.searchParams.set("apikey", apiKey);

        const target = `https://wallhaven.cc/api/v1/${path}${url.search}`;

        try {
          const res = await fetch(target, {
            headers: { "User-Agent": "PexelNest/1.0" },
            signal: AbortSignal.timeout(10_000),
          });
          const body = await res.text();
          return new Response(body, {
            status: res.status,
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "application/json",
              "Cache-Control": "public, max-age=60",
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
