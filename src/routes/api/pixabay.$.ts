import { createFileRoute } from "@tanstack/react-router";

/**
 * Pixabay API proxy.
 *
 * Proxies requests to pixabay.com/api/* to keep the API key server-side.
 * Reads API key from:
 *   1. X-Pixabay-Key request header (user-configured key from Settings)
 *   2. VITE_PIXABAY_API_KEY environment variable
 *
 * Usage: GET /api/pixabay/api/?q=nature&image_type=photo&orientation=horizontal
 */
export const Route = createFileRoute("/api/pixabay/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url    = new URL(request.url);
        const path   = (params as { _splat?: string })._splat ?? "";
        const apiKey =
          request.headers.get("X-Pixabay-Key") ??
          process.env.VITE_PIXABAY_API_KEY       ??
          "";

        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error:   "Pixabay API key not configured.",
              message: "Set VITE_PIXABAY_API_KEY in your .env file, or enter a key in Settings → API Integrations.",
            }),
            {
              status:  503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Inject the key into query params (Pixabay uses ?key=...)
        url.searchParams.set("key", apiKey);

        const target = `https://pixabay.com/${path}${url.search}`;

        try {
          const res  = await fetch(target, {
            headers: { "User-Agent": "PexelNest/1.0" },
            signal: AbortSignal.timeout(10_000),
          });
          const body = await res.text();
          return new Response(body, {
            status:  res.status,
            headers: {
              "Content-Type":  res.headers.get("content-type") ?? "application/json",
              "Cache-Control": "public, max-age=120",
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status:  502,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
