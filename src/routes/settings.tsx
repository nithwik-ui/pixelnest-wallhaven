import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  getSettings,
  saveSettings,
  getStorageStats,
  getCollections,
  deleteCollection,
  renameCollection,
  type AppSettings,
} from "@/lib/storage";
import { FolderOpen, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [s, setS] = useState<AppSettings>(() => ({
    theme: "light",
    quality: "original",
    downloadFolder: "Pictures/PixelNest",
    autoRefresh: false,
    defaultProvider: "wallhaven",
  }));
  const [stats, setStats] = useState({ favs: 0, dls: 0, hist: 0, cols: 0, storageMB: "0.0" });
  const [collections, setCollections] = useState(getCollections());

  useEffect(() => {
    setS(getSettings());
    const st = getStorageStats();
    setStats({
      favs: st.favoriteCount,
      dls: st.downloadCount,
      hist: st.historyCount,
      cols: st.collectionCount,
      storageMB: st.storageMB,
    });
    setCollections(getCollections());
  }, []);

  const update = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => {
    const next = { ...s, [k]: v };
    setS(next);
    saveSettings({ [k]: v });
    if (k === "theme") document.documentElement.classList.toggle("dark", v === "dark");
  };

  const clearCache = () => {
    if (confirm("Clear all local data (favorites, history, downloads)?")) {
      localStorage.removeItem("pixelnest.favorites");
      localStorage.removeItem("pixelnest.history");
      localStorage.removeItem("pixelnest.downloads");
      setStats((st) => ({ ...st, favs: 0, dls: 0, hist: 0 }));
      toast.success("Cache cleared.");
    }
  };

  const QUICK_FOLDERS = [
    { label: "Pictures/PixelNest", value: "Pictures/PixelNest" },
    { label: "Downloads", value: "Downloads" },
    { label: "Desktop", value: "Desktop" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Customize your PixelNest experience." />

      {/* Appearance */}
      <Group title="Appearance">
        <Row label="Theme" hint="Choose your preferred color mode.">
          <Segmented
            value={s.theme}
            onChange={(v) => update("theme", v as never)}
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]}
          />
        </Row>
      </Group>

      {/* Downloads */}
      <Group title="Downloads">
        <Row label="Wallpaper Folder" hint="Where downloaded wallpapers are saved.">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={s.downloadFolder}
                onChange={(e) => update("downloadFolder", e.target.value)}
                className="h-10 w-64 rounded-full border border-border bg-[var(--color-surface)] px-4 text-sm outline-none focus:bg-background"
              />
              <button
                onClick={async () => {
                  if (window.electronAPI) {
                    const path = await window.electronAPI.selectDirectory();
                    if (path) {
                      update("downloadFolder", path);
                      toast.success(`Download folder set to: ${path}`);
                    }
                  } else {
                    toast.error("Folder picker is only available in Desktop App.");
                  }
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_FOLDERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => update("downloadFolder", f.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    s.downloadFolder === f.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => update("downloadFolder", "Pictures/PixelNest")}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            </div>
          </div>
        </Row>
        <Row label="Quality" hint="Preferred download quality.">
          <Segmented
            value={s.quality}
            onChange={(v) => update("quality", v as never)}
            options={[
              { label: "Thumbnail", value: "thumb" },
              { label: "Original", value: "original" },
            ]}
          />
        </Row>
        <Row label="Auto Refresh" hint="Refresh feeds automatically in the background.">
          <Toggle value={s.autoRefresh} onChange={(v) => update("autoRefresh", v)} />
        </Row>
      </Group>

      {/* Storage */}
      <Group title="Storage">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <StatCard label="Favorites" value={stats.favs} />
          <StatCard label="Downloads" value={stats.dls} />
          <StatCard label="History" value={stats.hist} />
          <StatCard label="Collections" value={stats.cols} />
          <StatCard label="Est. Size" value={`${stats.storageMB} MB`} />
        </div>
        <div className="mt-4">
          <button
            onClick={clearCache}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" /> Clear all cache
          </button>
        </div>
      </Group>

      {/* Collections */}
      {collections.length > 0 && (
        <Group title="Collections">
          <div className="space-y-2">
            {collections.map((col) => (
              <div
                key={col.id}
                className="flex items-center justify-between rounded-xl border border-border bg-[var(--color-surface)] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{col.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {col.wallpaperIds.length} wallpaper{col.wallpaperIds.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const name = prompt("New name:", col.name);
                      if (name?.trim()) {
                        renameCollection(col.id, name.trim());
                        setCollections(getCollections());
                        toast.success("Collection renamed.");
                      }
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete collection "${col.name}"?`)) {
                        deleteCollection(col.id);
                        setCollections(getCollections());
                        toast.success("Collection deleted.");
                      }
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Group>
      )}

      {/* About */}
      <Group title="About">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground">
            <img
              src="/logo.svg"
              alt="PixelNest"
              className="h-8 w-8"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">PixelNest</span> v1.1
            </p>
            <p>Millions of high-quality wallpapers. Powered by Nithwik Studios.</p>
            <p>Built for a beautiful desktop.</p>
          </div>
        </div>
      </Group>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-2xl border border-border bg-background p-6">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-[var(--color-surface)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${value === o.value ? "bg-background text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-foreground" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-[var(--color-surface)] p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
