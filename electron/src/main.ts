import { app, BrowserWindow, shell } from "electron";
import { spawn, ChildProcess } from "child_process";
import path from "path";

const PORT = 8080;
let server: ChildProcess | null = null;
let win: BrowserWindow | null = null;

function startServer(): void {
  const bin = path.join(
    app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", ".."),
    ".bin",
    "server"
  );
  server = spawn(bin, [], { stdio: "inherit" });
  server.on("error", (err) => console.error("server error:", err));
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const tryLoad = (retries = 10): void => {
    win!.loadURL(`http://localhost:${PORT}`).catch(() => {
      if (retries > 0) setTimeout(() => tryLoad(retries - 1), 500);
    });
  };
  tryLoad();

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  server?.kill();
  if (process.platform !== "darwin") app.quit();
});
