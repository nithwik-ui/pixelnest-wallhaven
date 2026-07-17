import { Minus, Square, X, Moon, Sun, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/storage";

export function TitleBar() {
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

  const windowControls = typeof window !== "undefined" ? (window as any).electronAPI?.windowControls : undefined;

  return (
    <div
      className="flex h-[42px] shrink-0 items-center justify-end border-b border-border bg-background/60 px-2 backdrop-blur-xl"
      style={{ WebkitAppRegion: "drag" } as any}
    >


      {/* Right side: Tools & Window Controls */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as any}>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
        
        <div className="mx-1 h-4 w-[1px] bg-border" />

        {/* Window Controls */}
        <button
          onClick={() => windowControls?.minimize()}
          className="grid h-8 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => windowControls?.maximize()}
          className="grid h-8 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          title="Maximize"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => windowControls?.close()}
          className="grid h-8 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
