import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Compass,
  Flame,
  Sparkles,
  LayoutGrid,
  Heart,
  Download,
  History,
  Settings,
  Search,
  RefreshCw,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getSettings, saveSettings } from "@/lib/storage";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/latest", label: "Latest", icon: Sparkles },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const s = getSettings();
    setTheme(s.theme);
    document.documentElement.classList.toggle("dark", s.theme === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    saveSettings({ theme: next });
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    window.location.href = `/discover?q=${encodeURIComponent(q)}`;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background px-4 py-6 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-8h6v8"/></svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">PixelNest</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to as never}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[var(--color-surface)] text-foreground"
                    : "text-muted-foreground hover:bg-[var(--color-surface)] hover:text-foreground",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] transition-transform", active && "scale-110")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-xl border border-border bg-[var(--color-surface)] p-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Powered by Wallhaven</div>
          Millions of high-quality wallpapers.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 border-b border-border">
          <div className="flex items-center gap-3 px-6 py-3.5">
            <form onSubmit={onSearch} className="relative flex-1 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search millions of wallpapers…"
                className="h-11 w-full rounded-full border border-border bg-[var(--color-surface)] pl-11 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-foreground/20 focus:bg-background focus:shadow-[var(--shadow-soft)]"
              />
            </form>
            <button
              onClick={() => window.location.reload()}
              aria-label="Refresh"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:bg-[var(--color-surface)] hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:bg-[var(--color-surface)] hover:text-foreground"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
