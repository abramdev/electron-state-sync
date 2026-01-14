import { app, BrowserWindow } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { state } from "../dist/main.js";

// 当前文件路径
const currentFile = fileURLToPath(import.meta.url);
// 当前目录路径
const currentDir = dirname(currentFile);
// Preload 文件路径
const preloadPath = join(currentDir, "preload.cjs");
// 启动参数中的渲染框架标识
const frameworkArg = process.argv.find((arg) => arg.startsWith("--framework="));
// 目标框架名称
const frameworkName = frameworkArg ? frameworkArg.split("=")[1] : "base";
// 渲染端 HTML 文件映射
const rendererEntryMap = {
  react: "renderer-react.html",
  vue: "renderer-vue.html",
  svelte: "renderer-svelte.html",
  solid: "renderer-solid.html",
};
// 实际渲染端入口文件
const rendererEntry = rendererEntryMap[frameworkName] ?? "renderer.html";
// Renderer HTML 路径
const rendererUrl = pathToFileURL(join(currentDir, rendererEntry)).toString();

// 创建应用窗口
const createWindow = () =>
  new BrowserWindow({
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: preloadPath,
      sandbox: false,
    },
  });

// 启动 Electron 应用
const boot = () => {
  state({
    baseChannel: "state",
    name: "counter",
    initialValue: 0,
    allowRendererSet: true,
  });

  const window = createWindow();
  void window.loadURL(rendererUrl);
};

app.whenReady().then(boot);

app.on("window-all-closed", () => {
  app.quit();
});
