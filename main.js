const path = require("path");
const url = require("url");
const ChildProcess = require("child_process");
const os = require("os");

const Aria2c = require("aria2");
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const DownloaderPath = require("aria2c-static-electron").path;
const storage = require("electron-json-storage");
const { autoUpdater } = require("electron-updater");

const { generateRandomString } = require("./lib/helpers");
const Queue = require("./lib/Queue");
const QueueItem = require("./lib/Queue/QueueItem");

const DEBUG = true;

// Default Window Settings
const windowSettings = {
  frame: false,
  backgroundColor: "#6314EC",
  show: false
};

// Windows
let mainWindow = null;
let addWindow = null;

// Downloader
let Downloader = null;
let DownloaderProcess = null;
const DownloaderLogFile = path.join(
  os.tmpdir(),
  "youtubedl",
  "logs",
  "aria2c.log"
);
const DownloaderTempFile = path.join(
  os.tmpdir(),
  "youtubedl",
  "temp",
  "aria2c.tmp"
);

const DownloaderSecretToken = DEBUG ? "cool" : generateRandomString(24);

// Queue Settings
const queue = new Queue();

// Queue Handler!
queue.on("added", item => {});

// Menu Templates
const mainMenuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "Add Url",
        accelerator: "control+y",
        click: createAddWindow
      }
    ]
  }
];

// Edit mainMenuTemplate if DEBUG is true
if (DEBUG) {
  mainMenuTemplate.push({
    label: "Developer Tools",
    submenu: [
      {
        label: "Toggle DevTools",
        accelerator: "control+i",
        click() {
          BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
        }
      },
      {
        role: "reload"
      }
    ]
  });
}

// Communication between the APP!
ipcMain.on("get:videoDetails", (event, args) => {
  const { videoId } = args;
  const item = new QueueItem({
    VideoId: videoId,
    Downloader
  });
  queue.add(item);
  item
    .ParseVideo()
    .then(info => {
      event.sender.send("receive:videoDetails", {
        queueId: item.id,
        details: info
      });
    })
    .catch(err =>
      event.sender.send("receive:videoDetails", {
        error: err.message || err,
        errorCode: 1
      })
    );
});
ipcMain.on("queue:remove", (event, args) => {
  const { queueId } = args;
  queue.remove(queueId);
});
ipcMain.on("download:add", (event, args) => {
  const { queueId, format, FilePath, videoId } = args;
  if (
    queue.filter(
      item => item.CurrentFormatId === format && item.VideoId === videoId
    ).length > 0
  ) {
    event.returnValue = false;
  } else {
    const item = queue.find(item => item.id === queueId);
    item.Download(format, FilePath);
    event.returnValue = true;
  }
});

ipcMain.on("download:status", (event, args) => {
  const filteredQueue = queue.filter(
    item => item.Status !== "getting-metadata"
  );
  event.returnValue = filteredQueue.map(item => ({
    id: item.id,
    VideoInfo: item.VideoInfo,
    DownloaderInfo: item.DownloaderInfo,
    Format: item.CurrentFormatName,
    willEncode: item.willEncode,
    EncodingProgress: item.EncodingProgress,
    Status: item.Status,
    FilePath: item.FilePath
  }));
});

ipcMain.on("window-open:addWindow", (event, args) => {
  createAddWindow();
});
// Windows handlers
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 500,
    minWidth: 600,
    ...windowSettings
  });

  const mainWindowUrl = url.format({
    pathname: path.join(__dirname, "app/download.html"),
    protocol: "file:",
    slashes: true
  });

  mainWindow.loadURL(mainWindowUrl);

  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    console.log("MainWindow Closed");
    mainWindow = null;
    app.quit();
  });
}

function createAddWindow() {
  if (addWindow !== null) {
    addWindow.focus();
    return;
  }
  addWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 500,
    minWidth: 600,
    ...windowSettings
  });

  const addWindowUrl = url.format({
    pathname: path.join(__dirname, "app/index.html"),
    protocol: "file:",
    slashes: true
  });

  addWindow.loadURL(addWindowUrl);

  addWindow.on("ready-to-show", () => {
    addWindow.show();
  });

  addWindow.on("closed", () => {
    console.log("AddWindow Closed");
    addWindow = null;
  });
}

// Downloader Handler
function initDownloader() {
  console.log(`Initializing Downloader: ${DownloaderPath}`);
  DownloaderProcess = ChildProcess.spawn(DownloaderPath, [
    "--enable-rpc",
    `--rpc-secret=${DownloaderSecretToken}`,
    "--rpc-allow-origin-all",
    `--allow-overwrite=true`,
    `--auto-file-renaming=false`,
    `--max-connection-per-server=4`,
    `--timeout=600`,
    `--retry-wait=30`,
    `--max-tries=50`
  ]);

  DownloaderProcess.on("close", code => {
    console.log(`aria2c process exited with code ${code}`);
  });

  DownloaderProcess.stdout.once("data", data => {
    Downloader = new Aria2c({
      host: "localhost",
      port: 6800,
      secure: false,
      secret: DownloaderSecretToken,
      path: "/jsonrpc"
    });
    Downloader.open()
      .then(() => console.log("WebSocket Connection to Aria2c Successful."))
      .catch(err => console.log("No dice: ", err));
  });
}

app.on("ready", () => {
  initDownloader();
  createWindow();
  autoUpdater.checkForUpdates();
});

autoUpdater.on("update-downloaded", info => {
  autoUpdater.quitAndInstall();
});

app.on("window-all-closed", () => {
  console.log("All Windows Closed, Quitting App");
  if (DownloaderProcess != null) DownloaderProcess.kill();
  app.quit();
});
