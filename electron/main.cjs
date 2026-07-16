const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { fork } = require("child_process");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const net = require("net");
const https = require("https");
const { autoUpdater } = require("electron-updater");

let mainWindow = null;
let serverProcess = null;
let serverPort = 3000;

// AutoUpdater Configuration
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = false;
autoUpdater.allowDowngrade = false; // Rollback safety

// Find a free port dynamically
function getFreePort(startPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => {
      resolve(getFreePort(startPort + 1));
    });
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// Start local Nitro server in production
function startNitroServer(port) {
  const isDev = !app.isPackaged;
  if (isDev) return;

  const serverPath = path.join(app.getAppPath(), ".output/server/index.mjs");

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(port),
      NITRO_PRESET: "node-server",
    },
    silent: true,
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`[Server Error]: ${data}`);
  });
}

function resolveDownloadFolder(folderPath) {
  if (!folderPath) {
    return path.join(app.getPath("pictures"), "PixelNest");
  }
  if (path.isAbsolute(folderPath)) {
    return folderPath;
  }
  // If relative, translate standard Windows/user path strings
  if (folderPath.startsWith("Pictures")) {
    return path.join(app.getPath("pictures"), folderPath.replace(/^Pictures[/\\]?/, ""));
  }
  if (folderPath.startsWith("Downloads")) {
    return path.join(app.getPath("downloads"), folderPath.replace(/^Downloads[/\\]?/, ""));
  }
  if (folderPath.startsWith("Desktop")) {
    return path.join(app.getPath("desktop"), folderPath.replace(/^Desktop[/\\]?/, ""));
  }
  return path.join(os.homedir(), folderPath);
}

function getUniqueFilePath(folder, filename) {
  let filePath = path.join(folder, filename);
  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  const parsed = path.parse(filename);
  let counter = 1;
  while (true) {
    const newFilename = `${parsed.name} (${counter})${parsed.ext}`;
    filePath = path.join(folder, newFilename);
    if (!fs.existsSync(filePath)) {
      return filePath;
    }
    counter++;
  }
}

// HTTPS helper to download files following redirections
function downloadWithRedirects(url, fileStream, onProgress) {
  return new Promise((resolve, reject) => {
    function get(currentUrl) {
      https
        .get(currentUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Server returned status: ${res.statusCode}`));
            return;
          }

          const totalBytes = parseInt(res.headers["content-length"] ?? "0", 10);
          let downloadedBytes = 0;

          res.on("data", (chunk) => {
            downloadedBytes += chunk.length;
            fileStream.write(chunk);
            if (totalBytes > 0) {
              onProgress(Math.round((downloadedBytes / totalBytes) * 100));
            }
          });

          res.on("end", () => {
            fileStream.end();
            resolve();
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    }
    get(url);
  });
}

function setWallpaper(filePath) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(filePath);

    const psScript = `
$code = @'
using System;
using System.Runtime.InteropServices;
public class Win32Utils {
  [DllImport("user32.dll", CharSet=CharSet.Auto)]
  public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
'@
Add-Type -TypeDefinition $code
$null = [Win32Utils]::SystemParametersInfo(20, 0, "${absolutePath}", 3)
`;

    const buffer = Buffer.from(psScript, "utf16le");
    const base64 = buffer.toString("base64");

    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64}`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "PixelNest",
    icon: path.join(__dirname, "../public/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${serverPort}`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Setup auto-updater listeners
  autoUpdater.on("checking-for-update", () => {
    mainWindow.webContents.send("update-status", { status: "checking" });
  });
  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update-status", {
      status: "available",
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });
  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("update-status", { status: "not-available" });
  });
  autoUpdater.on("download-progress", (progressObj) => {
    mainWindow.webContents.send("update-status", {
      status: "downloading",
      percent: progressObj.percent,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    mainWindow.webContents.send("update-status", { status: "downloaded", version: info.version });

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Ready",
        message: `A new version (${info.version}) has been downloaded. Restart the application to apply the update?`,
        buttons: ["Restart Now", "Later"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });
  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("update-status", { status: "error", message: err.message });
  });
}

// IPC Handlers
ipcMain.handle("select-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("download-file", async (event, { url, filename, id, folder }) => {
  const destFolder = resolveDownloadFolder(folder);
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
  }

  const destPath = getUniqueFilePath(destFolder, filename);
  const fileStream = fs.createWriteStream(destPath);

  try {
    event.sender.send("download-progress", { id, status: "downloading", progress: 5 });
    await downloadWithRedirects(url, fileStream, (progress) => {
      // Ensure we limit messages sent over IPC channel
      event.sender.send("download-progress", { id, status: "downloading", progress });
    });
    event.sender.send("download-progress", { id, status: "completed", progress: 100 });
    return destPath;
  } catch (err) {
    fileStream.close();
    fs.unlink(destPath, () => {});
    event.sender.send("download-progress", { id, status: "failed", progress: 0 });
    throw err;
  }
});

ipcMain.handle("set-as-wallpaper", async (event, filePath) => {
  await setWallpaper(filePath);
  return true;
});

ipcMain.handle("check-for-updates", async () => {
  if (app.isPackaged) {
    return await autoUpdater.checkForUpdatesAndNotify();
  }
  return null;
});

app.on("ready", async () => {
  serverPort = await getFreePort(3000);
  startNitroServer(serverPort);
  // Wait slightly to ensure Nitro starts
  setTimeout(createWindow, 300);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
