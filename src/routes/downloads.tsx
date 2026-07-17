import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  getDownloads,
  removeDownload,
  updateDownload,
  type DownloadRecord,
  getSettings,
} from "@/lib/storage";
import { Download, FolderOpen, RotateCw, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/downloads")({ component: Downloads });

function Downloads() {
  const [items, setItems] = useState<DownloadRecord[]>([]);
  const settings = getSettings();

  useEffect(() => {
    const load = () => setItems(getDownloads());
    load();
    window.addEventListener("pexelnest:storage", load);
    return () => window.removeEventListener("pexelnest:storage", load);
  }, []);

  const queued = items.filter((i) => i.status === "queued" || i.status === "downloading");
  const completed = items.filter((i) => i.status === "completed");
  const failed = items.filter((i) => i.status === "failed");

  const retry = (r: DownloadRecord) => {
    updateDownload(r.id, { status: "downloading", progress: 20 });
    setTimeout(() => updateDownload(r.id, { status: "completed", progress: 100 }), 1500);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="Downloads" subtitle={`Saving to ${settings.downloadFolder}`} />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={items.length} />
        <Stat label="Completed" value={completed.length} />
        <Stat label="In Queue" value={queued.length} />
        <Stat label="Failed" value={failed.length} />
      </div>

      <Section
        title="Queue"
        empty="No active downloads."
        items={queued}
        onRetry={retry}
        onRemove={(id) => removeDownload(id)}
      />
      <Section
        title="Completed"
        empty="No completed downloads yet."
        items={completed}
        onRetry={retry}
        onRemove={(id) => removeDownload(id)}
      />
      <Section
        title="Failed"
        empty="No failed downloads."
        items={failed}
        onRetry={retry}
        onRemove={(id) => removeDownload(id)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--color-surface)] p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Section({
  title,
  empty,
  items,
  onRetry,
  onRemove,
}: {
  title: string;
  empty: string;
  items: DownloadRecord[];
  onRetry: (r: DownloadRecord) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold">
        {title}{" "}
        <span className="ml-2 text-sm font-normal text-muted-foreground">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-[var(--color-surface)] p-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-background p-3 pr-5 transition-shadow hover:shadow-[var(--shadow-soft)]"
            >
              <img
                src={r.wallpaper.thumbs.small}
                alt=""
                className="h-16 w-24 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">Wallpaper #{r.wallpaper.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.wallpaper.resolution} • {(r.wallpaper.file_size / 1024 / 1024).toFixed(1)} MB
                </div>
                {r.status === "downloading" && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface)]">
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <StatusPill status={r.status} />
              <div className="flex items-center gap-1">
                {r.status === "completed" && (
                  <a
                    href={r.wallpaper.path}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[var(--color-surface)] hover:text-foreground"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </a>
                )}
                {r.status === "failed" && (
                  <button
                    onClick={() => onRetry(r)}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[var(--color-surface)] hover:text-foreground"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(r.id)}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-[var(--color-surface)] hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: DownloadRecord["status"] }) {
  const map = {
    queued: {
      icon: Clock,
      label: "Queued",
      cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
    },
    downloading: {
      icon: Download,
      label: "Downloading",
      cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    },
    completed: {
      icon: CheckCircle2,
      label: "Complete",
      cls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    },
  }[status];
  const Icon = map.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${map.cls}`}
    >
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}
