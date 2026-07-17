import { createFileRoute } from "@tanstack/react-router";

/**
 * Pexels API proxy.
 *
 * Proxies requests to api.pexels.com/* to keep the API key server-side.
 * Reads API key from:
 *   1. X-Pexels-Key request header (user-configured key from Settings)
 *   2. VITE_PEXELS_API_KEY environment variable
 *
 * Usage: GET /api/pexels/v1/search?query=nature&orientation=landscape
 *        GET /api/pexels/v1/photos/:id
 */
export const Route = createFileRoute("/api/pexels/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params as { _splat?: string })._splat ?? "";
        const apiKey =
          process.env.VITE_PEXELS_API_KEY ??
          "563492ad6f917000010000014a66a1e3df6a445cb401e921d283626e";

        const target = `https://api.pexels.com/${path}${url.search}`;

        try {
          const res = await fetch(target, {
            headers: {
              Authorization: apiKey,
              "User-Agent": "PexelNest/1.0",
            },
            signal: AbortSignal.timeout(10_000),
          });
          const body = await res.text();
          return new Response(body, {
            status: res.status,
            headers: {
              "Content-Type": res.headers.get("content-type") ?? "application/json",
              "Cache-Control": "public, max-age=120",
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
