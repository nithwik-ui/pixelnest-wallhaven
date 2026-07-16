import { createFileRoute } from "@tanstack/react-router";

/**
 * Download proxy — fetches the wallpaper image server-side and returns it
 * with Content-Disposition: attachment so the browser shows a Save dialog.
 *
 * Usage: GET /api/download?url=<encoded_url>&filename=<encoded_name>
 */
export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const imageUrl = url.searchParams.get("url");
        const filename = url.searchParams.get("filename") ?? "wallpaper.jpg";

        if (!imageUrl) {
          return new Response(JSON.stringify({ error: "Missing url parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Validate URL — only allow known wallpaper domains
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(imageUrl);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid URL" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const ALLOWED_HOSTS = [
          "w.wallhaven.cc",
          "wallhaven.cc",
          "images.pexels.com",
          "images.unsplash.com",
        ];
        if (
          !ALLOWED_HOSTS.some(
            (h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`),
          )
        ) {
          return new Response(JSON.stringify({ error: "Domain not allowed" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const res = await fetch(imageUrl, {
            headers: { "User-Agent": "PixelNest/1.0" },
          });

          if (!res.ok) {
            return new Response(JSON.stringify({ error: `Upstream error: ${res.status}` }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          const contentType = res.headers.get("content-type") ?? "image/jpeg";
          const contentLength = res.headers.get("content-length");

          const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
          };
          if (contentLength) headers["Content-Length"] = contentLength;

          return new Response(res.body, { status: 200, headers });
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
