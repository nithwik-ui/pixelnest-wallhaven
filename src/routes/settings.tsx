import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { getSettings, saveSettings, getFavorites, getDownloads, getHistory, type AppSettings } from "@/lib/storage";
import { FolderOpen, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [s, setS] = useState<AppSettings>(() => ({ theme: "light", quality: "original", downloadFolder: "Pictures/PixelNest", autoRefresh: false }));
  const [stats, setStats] = useState({ favs: 0, dls: 0, hist: 0 });

  useEffect(() => {
    setS(getSettings());
    setStats({ favs: getFavorites().length, dls: getDownloads().length, hist: getHistory().length });
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
      setStats({ favs: 0, dls: 0, hist: 0 });
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Customize your PixelNest experience." />

      <Group title="Appearance">
        <Row label="Theme" hint="Choose your preferred color mode.">
          <Segmented value={s.theme} onChange={(v) => update("theme", v as never)} options={[{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }]} />
        </Row>
      </Group>

      <Group title="Downloads">
        <Row label="Wallpaper Folder" hint="Where downloaded wallpapers are saved.">
          <div className="flex items-center gap-2">
            <input value={s.downloadFolder} onChange={(e) => update("downloadFolder", e.target.value)} className="h-10 w-64 rounded-full border border-border bg-[var(--color-surface)] px-4 text-sm outline-none focus:bg-background" />
            <button className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"><FolderOpen className="h-4 w-4" /></button>
          </div>
        </Row>
        <Row label="Quality" hint="Preferred download quality.">
          <Segmented value={s.quality} onChange={(v) => update("quality", v as never)} options={[{ label: "Thumbnail", value: "thumb" }, { label: "Original", value: "original" }]} />
        </Row>
        <Row label="Auto Refresh" hint="Refresh feeds automatically in the background.">
          <Toggle value={s.autoRefresh} onChange={(v) => update("autoRefresh", v)} />
        </Row>
      </Group>

      <Group title="Storage">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Favorites" value={stats.favs} />
          <StatCard label="Downloads" value={stats.dls} />
          <StatCard label="History" value={stats.hist} />
        </div>
        <div className="mt-4">
          <button onClick={clearCache} className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Trash2 className="h-4 w-4" /> Clear all cache
          </button>
        </div>
      </Group>

      <Group title="About">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">PixelNest</span> v1.0</p>
          <p>Wallpapers powered by <a href="https://wallhaven.cc" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">Wallhaven</a>.</p>
          <p>Made for a beautiful desktop.</p>
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-2xl border border-border bg-background p-6">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { label: string; value: T }[] }) {
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
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-[var(--color-surface)] p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
