import { createFileRoute } from "@tanstack/react-router";

// Proxy to Wallhaven API to avoid CORS issues
export const Route = createFileRoute("/api/wallhaven/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params as { _splat?: string })._splat ?? "";
        const target = `https://wallhaven.cc/api/v1/${path}${url.search}`;

        try {
          const res = await fetch(target, {
            headers: { "User-Agent": "PixelNest/1.0" },
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
