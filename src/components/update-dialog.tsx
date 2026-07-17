import { useEffect } from "react";
import { useUpdateManager } from "@/lib/update-manager";
import { Loader2, CheckCircle2, AlertCircle, X, Download, RefreshCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function UpdateDialog() {
  const {
    dialogOpen,
    setDialogOpen,
    status,
    systemInfo,
    newVersion,
    releaseNotes,
    downloadProgress,
    downloadSizeMB,
    errorMessage,
    check,
    download,
    install,
    openStore,
  } = useUpdateManager();

  if (!dialogOpen) return null;

  const isStore = systemInfo?.isWindowsStore;

  const close = () => setDialogOpen(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity"
        onClick={() => status !== "checking" && status !== "downloading" && close()}
      />
      <div className="relative w-full max-w-md animate-fade-in overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex flex-col p-6">
          
          {/* CHECKING */}
          {status === "checking" && (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Checking for updates...</h3>
              <p className="mt-2 text-sm text-muted-foreground">Please wait while we connect to the server.</p>
            </div>
          )}

          {/* NOT AVAILABLE */}
          {status === "not-available" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">You're up to date!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You are using the latest version (v{systemInfo?.version || "Unknown"}).
              </p>
              <div className="mt-8 flex w-full justify-center">
                <button
                  onClick={close}
                  className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background transition-transform hover:scale-105"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* AVAILABLE */}
          {status === "available" && (
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-500/10 text-blue-500">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">New Version Available</h3>
                  <p className="text-sm text-muted-foreground">PexelNest v{newVersion}</p>
                </div>
              </div>

              {isStore ? (
                <div className="mt-6 rounded-xl bg-[var(--color-surface)] p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      This version of PexelNest was installed from Microsoft Store. Please update using the Microsoft Store to receive the latest features.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {releaseNotes && (
                    <div className="mt-6 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Release Notes</div>
                      <div className="max-h-32 overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4 text-sm text-muted-foreground">
                        {releaseNotes}
                      </div>
                    </div>
                  )}
                  {downloadSizeMB && (
                    <p className="mt-4 text-xs text-muted-foreground">Download Size: {downloadSizeMB} MB</p>
                  )}
                </>
              )}

              <div className="mt-8 flex w-full justify-end gap-3">
                <button
                  onClick={close}
                  className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface)]"
                >
                  Later
                </button>
                <button
                  onClick={isStore ? openStore : download}
                  className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-transform hover:scale-105"
                >
                  {isStore ? "Open Microsoft Store" : "Download Update"}
                </button>
              </div>
            </div>
          )}

          {/* DOWNLOADING */}
          {status === "downloading" && (
            <div className="flex flex-col items-center py-6">
              <h3 className="text-lg font-medium text-foreground">Downloading Update...</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You can continue using PexelNest while we download.
              </p>
              
              <div className="mt-8 w-full space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface)]">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                    style={{ width: `${downloadProgress}%` }} 
                  />
                </div>
              </div>
              
              <div className="mt-8 flex w-full justify-center">
                <button
                  onClick={close}
                  className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface)]"
                >
                  Hide in Background
                </button>
              </div>
            </div>
          )}

          {/* DOWNLOADED / READY */}
          {status === "downloaded" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-500/10 text-blue-500">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">Update Ready</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                PexelNest v{newVersion} has been downloaded successfully. Restart now to install the update?
              </p>
              
              <div className="mt-8 flex w-full justify-center gap-3">
                <button
                  onClick={close}
                  className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface)]"
                >
                  Later
                </button>
                <button
                  onClick={install}
                  className="rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-transform hover:scale-105"
                >
                  Restart Now
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">Update Failed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {errorMessage || "Unable to check for updates. Please check your internet connection."}
              </p>
              
              <div className="mt-8 flex w-full justify-center gap-3">
                <button
                  onClick={close}
                  className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => check(false)}
                  className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-transform hover:scale-105"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
