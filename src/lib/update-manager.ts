import { create } from "zustand";

export type UpdateStatus = 
  | "idle" 
  | "checking" 
  | "available" 
  | "downloading" 
  | "downloaded" 
  | "not-available" 
  | "error";

export interface SystemInfo {
  version: string;
  electron: string;
  arch: string;
  isWindowsStore: boolean;
}

export interface UpdateState {
  status: UpdateStatus;
  systemInfo: SystemInfo | null;
  newVersion: string | null;
  releaseNotes: string | null;
  downloadProgress: number; // 0 to 100
  downloadSizeMB: string | null;
  errorMessage: string | null;
  dialogOpen: boolean;

  // Actions
  init: () => Promise<void>;
  check: (silent?: boolean) => Promise<void>;
  download: () => Promise<void>;
  install: () => void;
  openStore: () => void;
  setDialogOpen: (open: boolean) => void;
}

const getElectronAPI = () => {
  if (typeof window !== "undefined") {
    return (window as any).electronAPI;
  }
  return null;
};

export const useUpdateManager = create<UpdateState>((set, get) => ({
  status: "idle",
  systemInfo: null,
  newVersion: null,
  releaseNotes: null,
  downloadProgress: 0,
  downloadSizeMB: null,
  errorMessage: null,
  dialogOpen: false,

  setDialogOpen: (open) => set({ dialogOpen: open }),

  init: async () => {
    const api = getElectronAPI();
    if (!api) return;

    // Fetch system info
    const info = await api.getSystemInfo();
    set({ systemInfo: info });

    // Listen to IPC status updates
    api.onUpdateStatus((data: any) => {
      const { status, version, releaseNotes, percent, total, message } = data;
      
      const update: Partial<UpdateState> = { status };
      
      if (status === "available") {
        update.newVersion = version;
        // Basic parser for release notes to strip HTML tags if present (electron-updater returns HTML usually)
        let cleanNotes = releaseNotes || "";
        if (cleanNotes.includes("<")) {
          cleanNotes = cleanNotes.replace(/<[^>]*>?/gm, "").trim();
        }
        update.releaseNotes = cleanNotes;
      }
      
      if (status === "downloading") {
        update.downloadProgress = percent || 0;
        if (total) {
          update.downloadSizeMB = (total / 1024 / 1024).toFixed(1);
        }
      }
      
      if (status === "downloaded") {
        update.newVersion = version;
      }
      
      if (status === "error") {
        update.errorMessage = message || "An unknown error occurred.";
      }
      
      set(update);
    });
  },

  check: async (silent = false) => {
    const api = getElectronAPI();
    if (!api) return;

    const { systemInfo } = get();
    if (!silent) {
      set({ status: "checking", errorMessage: null, dialogOpen: true });
    }

    if (systemInfo?.isWindowsStore) {
      // In a real Microsoft Store scenario we can't reliably check version via IPC 
      // without querying the store API, so if the user clicks "Check for Updates", 
      // we'll simulate an available update to prompt them to open the Store.
      if (!silent) {
        setTimeout(() => {
          set({ status: "available", newVersion: "Microsoft Store" });
        }, 1000);
      }
      return;
    }

    try {
      await api.checkForUpdates();
    } catch (err: any) {
      set({ status: "error", errorMessage: err.message });
    }
  },

  download: async () => {
    const api = getElectronAPI();
    if (!api) return;
    set({ status: "downloading", downloadProgress: 0 });
    await api.downloadUpdate();
  },

  install: () => {
    const api = getElectronAPI();
    if (api) api.installUpdate();
  },

  openStore: () => {
    const api = getElectronAPI();
    if (api) api.openMicrosoftStore();
  }
}));
