/**
 * Download utilities — proper browser download with progress tracking.
 * Uses the File System Access API (showSaveFilePicker) where available (Chromium),
 * falls back to a standard <a download> link.
 * Ready for Electron's dialog.showSaveDialog replacement on desktop.
 */
import type { Wallpaper } from "./providers/types";
import { addDownload, updateDownload, getSettings } from "./storage";

/** Derive a clean filename from a wallpaper */
function getFilename(w: Wallpaper): string {
  const ext = w.file_type?.split("/")[1] ?? "jpg";
  return `pixelnest-${w.id}.${ext}`;
}

/**
 * Download a wallpaper via the browser.
 * - Uses the proxy endpoint /api/download?url=... so the image is served
 *   with Content-Disposition: attachment and CORS headers.
 * - On Chromium (showSaveFilePicker available): opens native Save dialog.
 * - On other browsers: uses <a download> which triggers the browser's
 *   own save dialog.
 */
export async function downloadWallpaper(w: Wallpaper): Promise<void> {
  const recId = `${w.id}-${Date.now()}`;
  const filename = getFilename(w);

  addDownload({
    id: recId,
    wallpaper: w,
    status: "downloading",
    progress: 10,
    timestamp: Date.now(),
  });

  try {
    // Check if running inside Electron
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      const folder = getSettings().downloadFolder;

      // Start native download via IPC
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsubscribe = electronAPI.onDownloadProgress((data: any) => {
          if (data.id === recId) {
            updateDownload(recId, {
              status: data.status,
              progress: data.progress,
            });
            if (data.status === "completed") {
              unsubscribe();
              resolve();
            } else if (data.status === "failed") {
              unsubscribe();
              reject(new Error("Download failed in main process"));
            }
          }
        });

        electronAPI
          .downloadFile({
            url: w.path,
            filename,
            id: recId,
            folder,
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((err: any) => {
            unsubscribe();
            reject(err);
          });
      });
      return;
    }

    // Build proxy URL so browser download has correct headers
    const proxyUrl = `/api/download?url=${encodeURIComponent(w.path)}&filename=${encodeURIComponent(filename)}`;

    // Try File System Access API first (Chromium — shows native OS Save dialog)
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "Image",
              accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
            },
          ],
        });

        updateDownload(recId, { progress: 30 });

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        updateDownload(recId, { progress: 60 });

        const writable = await fileHandle.createWritable();
        await response.body!.pipeTo(writable);

        updateDownload(recId, { status: "completed", progress: 100 });
        return;
      } catch (e) {
        // User cancelled Save dialog — treat as abort, not failure
        if (e instanceof Error && e.name === "AbortError") {
          updateDownload(recId, { status: "failed", progress: 0 });
          throw new Error("Download cancelled");
        }
        // Fall through to standard download on other errors
        console.warn("File System Access API failed, falling back:", e);
      }
    }

    // Standard fallback: <a download> — browser shows its own save dialog
    updateDownload(recId, { progress: 40 });
    const a = document.createElement("a");
    a.href = proxyUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Give the browser time to start the download
    setTimeout(() => {
      updateDownload(recId, { status: "completed", progress: 100 });
    }, 1500);
  } catch (error) {
    updateDownload(recId, { status: "failed", progress: 0 });
    throw error;
  }
}
