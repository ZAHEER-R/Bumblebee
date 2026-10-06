
console.log("==================================");
console.log("THIS IS MY MAIN.JS");
console.log(__filename);
console.log("==================================");


const { app, BrowserWindow, ipcMain, Menu, nativeImage, globalShortcut, Tray, session } = require("electron");
const path = require("path");
require("@next/env").loadEnvConfig(path.join(__dirname, ".."));
const { getActiveModel, processMessage } = require("./agent");
const aliases = require("./services/aliases");
const { getInstalledApps } = require("./services/appScanner");
const { setApps } = require("./services/appCache");
const {
    launchApp,
    closeApp,
    typeInNotepad,
    setClockAlarm,
    openUserFolder,
    createUserFolder,
    openMusicSearch,
    calculate,
} = require("./commands/appLauncher");

/*
const fs = require("fs");
const outputPath = path.join(__dirname, "apps.json");
*/

const {
  openWebsite,
} = require("./commands/browser");
let apps = [];
let appsReady;
let mainWindow;
let tray;
let quitting = false;


// GPU optimization
app.commandLine.appendSwitch(
  "enable-gpu-rasterization"
);

app.commandLine.appendSwitch(
  "enable-zero-copy"
);



console.log("REGISTERING IPC HANDLERS");


ipcMain.handle("ping", async () => {

    return "BUMBLEBEE ONLINE";

});

ipcMain.handle("agent:chat", async (_, message) => {
    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
        return { reply: "Please enter a message under 4,000 characters.", tools: [], model: getActiveModel() };
    }
    await appsReady;
    return processMessage(message.trim(), apps);
});

ipcMain.handle("agent:model", () => getActiveModel());

ipcMain.handle("app:open", async (_, appName) => {
    if (typeof appName !== "string" || !appName.trim()) {
        return { success: false, message: "Please specify an application to open." };
    }

    await appsReady;

    console.log("Requested:", appName);
    console.log("Apps loaded:", apps.length);

  /*  const found = apps.find(
        a => a.Name && a.Name.toLowerCase() === "notepad"
    );
    console.log("Found:", found);
*/
    const search = (aliases[appName.toLowerCase()] || appName)
        .toLowerCase()
        .replace(/\s+/g, "")
        .trim();

    const found = apps.find(app => {
        if (!app.Name) return false;

        const name = app.Name
            .toLowerCase()
            .replace(/\s+/g, "")
            .trim();

        return (
            name === search ||
            name.includes(search) ||
            search.includes(name)
        );
    });

    console.log("Searching:", search);
    console.log("Found:", found);

    if (!found) {
        return {
            success: false,
            message: `Couldn't find an installed application matching "${appName}".`
        };
    }
console.log("================================");
console.log("REQUEST :", appName);
console.log("SEARCH  :", search);
console.log("FOUND   :", found.Name);
console.log("TYPE    :", found.Type);
console.log("TARGET  :", found.Target);
console.log("================================");

return await launchApp(found);
});

ipcMain.handle("app:close", async (_, appName) => {
    if (typeof appName !== "string" || !appName.trim()) {
        return { success: false, message: "Please specify an application to close." };
    }

    return closeApp(appName);

});

ipcMain.handle("notepad:type", async (_, text) => {
    if (typeof text !== "string") {
        return { success: false, message: "Notepad text must be plain text." };
    }

    return typeInNotepad(text);
});

ipcMain.handle("alarm:set", async (_, time) => {
    if (typeof time !== "string") {
        return { success: false, message: "Please specify an alarm time." };
    }

    return setClockAlarm(time);
});

ipcMain.handle("explorer:open", async (_, location) => {
    if (typeof location !== "string") {
        return { success: false, message: "Please specify a supported folder location." };
    }

    return openUserFolder(location);
});

ipcMain.handle("folder:create", async (_, location, name) => {
    if (typeof location !== "string" || typeof name !== "string") {
        return { success: false, message: "Please provide a folder name and a supported location." };
    }

    return createUserFolder(location, name);
});

ipcMain.handle("music:search", async (_, provider, query) => {
    if (typeof provider !== "string" || typeof query !== "string") {
        return { success: false, message: "Please provide Spotify or YouTube and a search query." };
    }

    return openMusicSearch(provider, query);
});

ipcMain.handle("calculator:compute", async (_, expression) => {
    if (typeof expression !== "string" || expression.length > 200) {
        return { success: false, message: "Please provide a basic arithmetic expression under 200 characters." };
    }

    return calculate(expression);
});

ipcMain.handle("browser:open", async (_, url) => {

    try {

        await openWebsite(url);

        return {
            success: true,
            message: `Opening ${url}`
        };

    } catch (err) {

        return {
            success: false,
            message: err.message
        };

    }

});

/*//first prior
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700
    });

    mainWindow = win;
    win.on("close", (event) => {
        if (!quitting) {
            event.preventDefault();
            win.hide();
        }
    });
    win.on("closed", () => {
        if (mainWindow === win) mainWindow = null;
    });

    win.loadURL("http://localhost:3000");

    win.webContents.openDevTools();
}*/
/*
app.whenReady().then(() => {
    console.log("Electron started");
    createWindow();
});
*/


/*app.whenReady().then(async () => {

    console.log("Electron started");

    try {

        apps = await getInstalledApps();

        console.log("Installed Apps:", apps.length);

        setApps(apps);

    } catch (err) {

        console.error("Scanner Error:", err);

    }

    createWindow();

});*/


function createWindow() {

    const win = new BrowserWindow({

        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: "#000000",

        webPreferences: {

            preload: path.join(__dirname, "preload.js"),

            contextIsolation: true,

            nodeIntegration: false

        }

    });

    win.once("ready-to-show", () => win.show());
    win.webContents.on("did-fail-load", (_, errorCode, description, validatedURL) => {
        console.error(`Failed to load ${validatedURL}: ${description} (${errorCode})`);
    });
    win.loadURL(process.env.ULTRON_URL || "http://localhost:3000").catch((error) => {
        console.error("Unable to load the Bumblebee UI:", error);
        win.show();
    });

    return win;
}

function toggleWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
    }
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
        mainWindow.show();
        mainWindow.focus();
    }
}

function createTray() {
    const iconSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#62c8ff"/><circle cx="8" cy="8" r="3" fill="#071426"/></svg>').toString("base64");
    tray = new Tray(nativeImage.createFromDataURL(`data:image/svg+xml;base64,${iconSvg}`));
    tray.setToolTip("Bumblebee Agent");
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: "Show Bumblebee", click: toggleWindow },
        { label: "Quit", click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on("click", toggleWindow);
}


app.whenReady().then(async () => {

    console.log("APP IS READY");

    const appOrigin = new URL(process.env.ULTRON_URL || "http://localhost:3000").origin;
    const isAllowedMediaOrigin = (origin) => {
        try {
            return new URL(origin).origin === appOrigin;
        } catch {
            return false;
        }
    };
    session.defaultSession.setPermissionCheckHandler((_webContents, permission, origin) =>
        permission === "media" && isAllowedMediaOrigin(origin)
    );
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
        const origin = details.requestingUrl || webContents.getURL();
        const mediaTypes = details.mediaTypes || [];
        const requestedOnlySupportedMedia = mediaTypes.length === 0 || mediaTypes.every((type) => type === "audio" || type === "video");
        callback(permission === "media" && requestedOnlySupportedMedia && isAllowedMediaOrigin(origin));
    });

    createWindow();
    createTray();
    globalShortcut.register("CommandOrControl+Shift+U", toggleWindow);

    appsReady = getInstalledApps()
        .then((installedApps) => {
            apps = installedApps;
            setApps(apps);
            console.log("Installed Apps:", apps.length);
        })
        .catch((error) => {
            console.error("Unable to scan installed applications:", error);
            apps = [];
        });

});

app.on("activate", () => {
    toggleWindow();
});

app.on("window-all-closed", () => {
    if (quitting && process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    quitting = true;
    globalShortcut.unregisterAll();
});

/*


ipcMain.handle("app:open", async (_, appName) => {

    console.log("Requested:", appName);

    if (!appName) {

        return {
            success: false,
            message: "No application name supplied."
        };

    }

    const search = appName
        .toLowerCase()
        .replace(/\s+/g, "")
        .trim();

    /*const aliases = {

        chrome: "google chrome",
        edge: "microsoft edge",
        brave: "brave",
        firefox: "firefox",
        opera: "opera",

        vscode: "visual studio code",
        code: "visual studio code",
        terminal: "windows terminal",
        powershell: "powershell",
        commandprompt: "command prompt",

        whatsapp: "whatsapp",
        youtube: "youtube",
        instagram: "instagram",
        antigravity: "antigravity",
        fileexplorer: "file explorer",
        microsoftstore: "microsoft store",
        spotify: "spotify",
        cmd: "command prompt",
        paint: "paint",
        photos: "photos",
        calculator: "calculator",
        camera: "camera",
        notepad: "notepad",
        settings: "settings",
        snippingtool: "snipping tool",
        taskmanager: "task manager",
        xbox: "xbox",
        discord: "discord",
        telegram: "telegram",
        vlc: "vlc media player",
        steam: "steam",
        zoom: "zoom",
        onenote: "onenote",
        word: "microsoft word",
        excel: "microsoft excel",
        powerpoint: "microsoft powerpoint",
        python: "python",
        java: "java",
        mysql: "mysql",
        tableau: "tableau",
        slack: "slack",
        powerbi: "power bi",
        teams: "microsoft teams",
        clock: "clock",
        calendar: "calendar",
        weather: "weather",
        outlook: "outlook",
        pycharm: "pycharm",
        intellij: "intellij idea"
    };

    const target = aliases[search] || search;
*/
/*
    const target = (aliases[search] || search)
        .toLowerCase()
        .replace(/\s+/g, "")
        .trim();

    console.log("Searching for:", target);
    console.log("Apps loaded:", apps.length);

   const found = apps.find(app => {
    if (!app.Name) return false;

    const name = app.Name
        .toLowerCase()
        .replace(/\s+/g, "")
        .trim();

        return (
            name === target ||
            name.includes(target) ||
            target.includes(name)
        );
    });

    if(found){
        console.log("Found app:", found);
    }
    
    if (!found) {

        console.log("Application not found.");

        return {
            success: false,
            message: `Couldn't find "${appName}"`

        };

    }


    console.log("MATCHED:", found.Name);

    return await launchApp(found);

});

*/