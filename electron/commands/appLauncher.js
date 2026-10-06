const { exec, execFile } = require("child_process");
const { app, clipboard, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function execute(command) {
    return new Promise((resolve) => {
        exec(command, { windowsHide: true }, (err) => {
            if (err) {
                console.error("Command failed:", command);
                console.error(err.message);
                return resolve(false);
            }

            resolve(true);
        });
    });
}

async function launchApp(app) {

    if (!app) {
        return {
            success: false,
            message: "Application not found."
        };
    }

    console.log("================================");
    console.log("Launching:", app.Name);
    console.log("Type:", app.Type);
    console.log("Target:", app.Target);
    console.log("================================");

    // -----------------------
    // Microsoft Store Apps
    // -----------------------
 if (app.Type === "uwp") {

    spawn(
        "explorer.exe",
        [`shell:AppsFolder\\${app.Target}`],
        {
            detached: true,
            stdio: "ignore"
        }
    ).unref();

    return {
        success: true,
        message: `Opening ${app.Name}`
    };
}

    // -----------------------
    // Desktop EXE
    // -----------------------

    let exe = app.Target;

    exe = exe.replace(/^"+|"+$/g, "");
    exe = exe.split(",")[0].trim();

    console.log("Executable:", exe);

    if (!fs.existsSync(exe)) {

        console.log("Executable not found:", exe);

        return {
            success: false,
            message: `Executable not found for ${app.Name}`
        };
    }

    // Method 1
    let ok = await execute(`"${exe}"`);

    if (ok) {
        return {
            success: true,
            message: `Opening ${app.Name}`
        };
    }

    // Method 2
    ok = await execute(`start "" "${exe}"`);

    if (ok) {
        return {
            success: true,
            message: `Opening ${app.Name}`
        };
    }

    // Method 3
    ok = await execute(
        `powershell Start-Process -FilePath "${exe}"`
    );

    if (ok) {
        return {
            success: true,
            message: `Opening ${app.Name}`
        };
    }

    // Method 4
    try {

        await shell.openPath(exe);

        return {
            success: true,
            message: `Opening ${app.Name}`
        };

    } catch (err) {

        console.error(err);

    }

    return {
        success: false,
        message: `Unable to open ${app.Name}`
    };
}

async function typeInNotepad(text) {
    if (typeof text !== "string" || !text.trim()) {
        return { success: false, message: "There is no text to put in Notepad." };
    }
    if (text.length > 10000) {
        return { success: false, message: "The Notepad text is too long (maximum 10,000 characters)." };
    }

    const notesDirectory = path.join(app.getPath("documents"), "Bumblebee Notes");
    await fs.promises.mkdir(notesDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const notePath = path.join(notesDirectory, `Note-${timestamp}.txt`);
    await fs.promises.writeFile(notePath, text, "utf8");

    return new Promise((resolve) => {
        const process = spawn("notepad.exe", [notePath], {
            detached: true,
            stdio: "ignore",
        });

        process.once("error", (error) => {
            console.error("Unable to open the Notepad note:", error);
            resolve({
                success: false,
                message: `Saved your text to ${notePath}, but Windows could not open Notepad.`,
            });
        });

        process.once("spawn", () => {
            process.unref();
            resolve({
                success: true,
                message: `Opened Notepad with your text. A copy is saved at ${notePath}.`,
            });
        });
    });
}

async function setClockAlarm(time) {
    if (process.platform !== "win32" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return { success: false, message: "Use a valid 24-hour time to set a Windows Clock alarm." };
    }

    const alarmUri = `ms-clock:alarm?time=${time}`;
    try {
        await shell.openExternal(alarmUri);
        return {
            success: true,
            message: `Opened Windows Clock with an alarm request for ${time}. Please confirm the alarm is enabled in Clock.`,
        };
    } catch (error) {
        console.error("Unable to open the Windows Clock alarm link:", error);
        return {
            success: false,
            message: `Windows could not open the Clock alarm for ${time}. Open the Clock app and set it manually.`,
        };
    }
}

const USER_FOLDERS = {
    desktop: "desktop",
    documents: "documents",
    downloads: "downloads",
    pictures: "pictures",
    music: "music",
};

async function openUserFolder(location) {
    const folder = Object.hasOwn(USER_FOLDERS, location) ? USER_FOLDERS[location] : null;
    let folderPath;

    if (folder) {
        folderPath = app.getPath(folder);
    } else if (process.platform === "win32" && typeof location === "string" && path.win32.isAbsolute(location)) {
        try {
            const stats = await fs.promises.stat(location);
            if (!stats.isDirectory()) {
                return { success: false, message: "That path is not a folder." };
            }
            folderPath = location;
        } catch (error) {
            if (error.code === "ENOENT" || error.code === "ENOTDIR") {
                return { success: false, message: "That folder path does not exist." };
            }
            throw error;
        }
    } else {
        return { success: false, message: "Use Desktop, Documents, Downloads, Pictures, Music, or an existing absolute folder path." };
    }

    const error = await shell.openPath(folderPath);
    if (error) {
        return { success: false, message: `Couldn't open that folder: ${error}` };
    }

    return { success: true, message: `Opened ${folderPath}.` };
}

async function createUserFolder(location, name) {
    if (!["desktop", "documents", "downloads"].includes(location)) {
        return { success: false, message: "Folders can only be created in Desktop, Documents, or Downloads." };
    }

    const safeName = name.trim();
    if (!safeName || safeName.length > 80 || /[<>:"/\\|?*\x00-\x1f]/.test(safeName) || safeName === "." || safeName === "..") {
        return { success: false, message: "Use a folder name without path separators or Windows-reserved characters." };
    }

    const folderPath = path.join(app.getPath(location), safeName);
    try {
        await fs.promises.mkdir(folderPath);
    } catch (error) {
        if (error.code === "EEXIST") {
            return { success: false, message: `A folder named "${safeName}" already exists there.` };
        }
        throw error;
    }

    const openError = await shell.openPath(folderPath);
    if (openError) {
        console.error("Created folder, but couldn't open it:", openError);
        return { success: true, message: `Created "${safeName}" in ${location}, but couldn't open it.` };
    }

    return { success: true, message: `Created and opened "${safeName}" in ${location}.` };
}

function openMusicSearch(provider, query) {
    if (!["spotify", "youtube"].includes(provider) || typeof query !== "string" || !query.trim() || query.length > 300) {
        return Promise.resolve({ success: false, message: "Provide a Spotify or YouTube search and a query under 300 characters." });
    }

    const searchQuery = query.trim();
    const url = provider === "spotify"
        ? `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    if (provider === "spotify") {
        return shell.openExternal(`spotify:search:${encodeURIComponent(searchQuery)}`).then(
            () => ({
                success: true,
                message: `Opened Spotify search results for "${searchQuery}". Choose a track to start playback.`,
            }),
            async (error) => {
                console.warn("Spotify app protocol is unavailable; opening web search.", error);
                try {
                    await shell.openExternal(url);
                } catch (fallbackError) {
                    console.error("Unable to open Spotify web search:", fallbackError);
                    return { success: false, message: "Couldn't open Spotify or its web search." };
                }
                return {
                    success: true,
                    message: `Opened Spotify web search results for "${searchQuery}". Choose a track to start playback.`,
                };
            },
        );
    }

    return shell.openExternal(url).then(
        () => ({
            success: true,
            message: `Opened YouTube search results for "${searchQuery}". Choose a result to start playback.`,
        }),
        (error) => {
            console.error(`Unable to open ${provider} search:`, error);
            return { success: false, message: `Couldn't open ${provider} search results.` };
        },
    );
}

function calculate(expression) {
    const tokens = expression.match(/\d+(?:\.\d+)?|[()+*/%-]/g);
    if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) {
        return { success: false, message: "I can calculate basic arithmetic with numbers and +, -, *, /, %, and parentheses." };
    }

    let position = 0;
    function parsePrimary() {
        if (tokens[position] === "(") {
            position++;
            const value = parseExpression();
            if (tokens[position++] !== ")") throw new Error("Missing closing parenthesis.");
            return value;
        }
        const value = Number(tokens[position++]);
        if (!Number.isFinite(value)) throw new Error("Invalid number.");
        return value;
    }
    function parseUnary() {
        if (tokens[position] === "+") {
            position++;
            return parseUnary();
        }
        if (tokens[position] === "-") {
            position++;
            return -parseUnary();
        }
        return parsePrimary();
    }
    function parseProduct() {
        let value = parseUnary();
        while (["*", "/", "%"].includes(tokens[position])) {
            const operator = tokens[position++];
            const right = parseUnary();
            if ((operator === "/" || operator === "%") && right === 0) throw new Error("Division by zero is undefined.");
            value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
        }
        return value;
    }
    function parseExpression() {
        let value = parseProduct();
        while (tokens[position] === "+" || tokens[position] === "-") {
            const operator = tokens[position++];
            const right = parseProduct();
            value = operator === "+" ? value + right : value - right;
        }
        return value;
    }

    try {
        const value = parseExpression();
        if (position !== tokens.length || !Number.isFinite(value)) throw new Error("Invalid arithmetic expression.");
        const result = Number(value.toPrecision(12)).toString();
        clipboard.writeText(result);
        return new Promise((resolve) => {
            const calculator = spawn("calc.exe", [], { detached: true, stdio: "ignore" });
            calculator.once("error", (error) => {
                console.error("Unable to open Calculator:", error);
                resolve({
                    success: true,
                    message: `The answer is ${result}, and it is copied to your clipboard. Windows could not open Calculator.`,
                });
            });
            calculator.once("spawn", () => {
                calculator.unref();
                resolve({
                    success: true,
                    message: `The answer is ${result}. I opened Calculator and copied the answer to your clipboard; press Ctrl+V in Calculator if you want it displayed there.`,
                });
            });
        });
    } catch (error) {
        return { success: false, message: error.message };
    }
}

const CLOSEABLE_APPS = {
    chrome: "chrome",
    msedge: "msedge",
    firefox: "firefox",
    vscode: "Code",
    code: "Code",
    notepad: "notepad",
    calculatorapp: "CalculatorApp",
    calculator: "CalculatorApp",
    mspaint: "mspaint",
    cmd: "cmd",
    terminal: "WindowsTerminal",
};

function closeApp(appName) {
    const imageName = CLOSEABLE_APPS[appName.toLowerCase()];

    if (!imageName) {
        return Promise.resolve({
            success: false,
            message: `Closing "${appName}" is not supported.`,
        });
    }

    return new Promise((resolve) => {
        execFile("taskkill.exe", ["/IM", `${imageName}.exe`], { windowsHide: true }, (error) => {
            if (error) {
                resolve({
                    success: false,
                    message: `Couldn't close ${appName}. It may not be running or may have unsaved work.`,
                });
                return;
            }

            resolve({ success: true, message: `Closed ${appName}.` });
        });
    });
}

module.exports = {
    launchApp,
    closeApp,
    typeInNotepad,
    setClockAlarm,
    openUserFolder,
    createUserFolder,
    openMusicSearch,
    calculate,
};