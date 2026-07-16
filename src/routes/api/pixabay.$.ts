import { createFileRoute } from "@tanstack/react-router";

/**
 * Pixabay API proxy.
 *
 * Proxies requests to pixabay.com/api/* to keep the API key server-side.
 * Reads API key from:
 *   1. VITE_PIXABAY_API_KEY environment variable
 *   2. Bundled fallback Pixabay API key
 *
 * Usage: GET /api/pixabay/api/?q=nature&image_type=photo
 */
export const Route = createFileRoute("/api/pixabay/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params as { _splat?: string })._splat ?? "";

        // Use environment variable if set, otherwise fallback to the official public Pixabay demo key
        const apiKey = process.env.VITE_PIXABAY_API_KEY ?? "488006-8d1847cc08dfa5b51a029db51";

        url.searchParams.set("key", apiKey);

        // Pixabay's base URL is https://pixabay.com/
        // E.g. https://pixabay.com/api/?key=...
        const target = `https://pixabay.com/${path}${url.search}`;

        try {
          const res = await fetch(target, {
            headers: {
              "User-Agent": "PixelNest/1.0",
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
