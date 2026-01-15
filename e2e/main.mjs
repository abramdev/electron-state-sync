import { app, BrowserWindow } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { state } from "../dist/main.js";

// Current file path
const currentFile = fileURLToPath(import.meta.url);
// Current directory path
const currentDir = dirname(currentFile);
// Preload file path
const preloadPath = join(currentDir, "preload.cjs");
// Render framework identifier from startup arguments
const frameworkArg = process.argv.find((arg) => arg.startsWith("--framework="));
// Target framework name
const frameworkName = frameworkArg ? frameworkArg.split("=")[1] : "base";
// Window count parameter from startup arguments
const windowsArg = process.argv.find((arg) => arg.startsWith("--windows="));
// Window count to launch
const windowCount = windowsArg ? Number(windowsArg.split("=")[1]) : 1;
// Validated window count
const resolvedWindowCount =
  Number.isFinite(windowCount) && windowCount > 0 ? windowCount : 1;
// Renderer HTML file mapping
const rendererEntryMap = {
  react: "renderer-react.html",
  preact: "renderer-preact.html",
  vue: "renderer-vue.html",
  svelte: "renderer-svelte.html",
  solid: "renderer-solid.html",
  zustand: "renderer-zustand.html",
  "react-query": "renderer-react-query.html",
  jotai: "renderer-jotai.html",
  redux: "renderer-redux.html",
};
// Actual renderer entry file
const rendererEntry = rendererEntryMap[frameworkName] ?? "renderer.html";
// Renderer HTML path
const rendererUrl = pathToFileURL(join(currentDir, rendererEntry)).toString();

// Create application window
const createWindow = () =>
  new BrowserWindow({
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: preloadPath,
      sandbox: false,
    },
  });

// Hold window references to prevent GC
const windows = [];

// Boot Electron application
const boot = () => {
  // For zustand, use object structure since the store contains { count, setCount, increment }
  // Other frameworks use simple number values
  const initialValue = frameworkName === "zustand" ? { count: 0 } : 0;

  state({
    baseChannel: "state",
    name: "counter",
    initialValue,
    allowRendererSet: true,
  });

  for (let index = 0; index < resolvedWindowCount; index += 1) {
    const window = createWindow();
    windows.push(window);
    void window.loadURL(rendererUrl);
  }
};

app.whenReady().then(boot);

app.on("window-all-closed", () => {
  app.quit();
});
