const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { app, clipboard, dialog, shell } = require("electron");
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const { closeApp, launchApp, setClockAlarm, typeInNotepad } = require("./commands/appLauncher");
const aliases = require("./services/aliases");
const MODELS = require("../core/models.json");

const execFileAsync = promisify(execFile);
let modelIndex = 0;
let history = [];

function compactHistory(contents) {
  const conversationalTurns = contents.filter((content) =>
    !content.parts?.some((part) => part.functionCall || part.functionResponse)
  );
  const completeExchanges = [];

  for (let index = 0; index < conversationalTurns.length - 1; index++) {
    if (
      conversationalTurns[index].role === "user" &&
      conversationalTurns[index + 1].role === "model"
    ) {
      completeExchanges.push(conversationalTurns[index], conversationalTurns[index + 1]);
      index++;
    }
  }

  return completeExchanges.slice(-20);
}

const object = (properties, required = []) => ({ type: SchemaType.OBJECT, properties, required });
const string = (description) => ({ type: SchemaType.STRING, description });
const number = (description) => ({ type: SchemaType.NUMBER, description });
const declarations = [
  ["open_app", "Open an installed Windows application by common name or alias.", object({ appName: string("Application name") }, ["appName"])],
  ["close_app", "Close a supported running Windows application.", object({ appName: string("Application name") }, ["appName"])],
  ["list_running_apps", "List visible running desktop applications.", object()],
  ["list_installed_apps", "List installed desktop applications available to launch.", object()],
  ["create_folder", "Create a folder. Relative paths are created on the Desktop.", object({ folderPath: string("Folder name or absolute path") }, ["folderPath"])],
  ["move_file", "Move a file or folder between user-accessible locations.", object({ sourcePath: string("Source path"), destinationPath: string("Destination path") }, ["sourcePath", "destinationPath"])],
  ["copy_file", "Copy a file or folder between user-accessible locations.", object({ sourcePath: string("Source path"), destinationPath: string("Destination path") }, ["sourcePath", "destinationPath"])],
  ["delete_path", "Permanently delete a file or folder after asking the user to confirm.", object({ targetPath: string("Path to delete") }, ["targetPath"])],
  ["list_dir", "List files and folders in a directory.", object({ folderPath: string("Directory path; defaults to Desktop") })],
  ["open_url", "Open a web URL in the default browser.", object({ url: string("HTTP or HTTPS URL") }, ["url"])],
  ["search_youtube", "Search YouTube in the default browser.", object({ query: string("Search query") }, ["query"])],
  ["search_google", "Search Google in the default browser.", object({ query: string("Search query") }, ["query"])],
  ["type_text", "Type text into the currently focused Windows application.", object({ text: string("Text to type") }, ["text"])],
  ["press_keys", "Press a keyboard shortcut such as ENTER, CTRL+C, or ALT+F4.", object({ keys: string("Keyboard keys separated by plus signs") }, ["keys"])],
  ["set_window_layout", "Arrange the active window left, right, maximize, or restore.", object({ layout: string("left, right, maximize, or restore") }, ["layout"])],
  ["take_screenshot", "Save a screenshot of the current desktop to the Desktop.", object()],
  ["get_system_info", "Report basic Windows system and runtime information.", object()],
  ["run_powershell", "Run a PowerShell command only after showing it to the user for approval.", object({ command: string("PowerShell command") }, ["command"])],
  ["play_spotify", "Open Spotify search results for a query.", object({ query: string("Artist, album, or track") }, ["query"])],
  ["media_play_pause", "Toggle media playback using the Windows media key.", object()],
  ["media_next", "Skip to the next media track.", object()],
  ["media_previous", "Go to the previous media track.", object()],
  ["volume_set", "Set approximate system volume from 0 to 100.", object({ level: number("Volume level from 0 to 100") }, ["level"])],
  ["volume_mute", "Toggle system mute.", object()],
  ["write_notepad", "Create a text note and open it in Notepad.", object({ content: string("Note text") }, ["content"])],
  ["draw_in_paint", "Open Paint and draw a simple text/shape canvas from a description.", object({ description: string("What to draw") }, ["description"])],
  ["set_alarm", "Open Windows Clock with the requested alarm time.", object({ time: string("Time in 24-hour HH:MM format") }, ["time"])],
].map(([name, description, parameters]) => ({ name, description, parameters }));

function runPowerShell(script, timeout = 20000) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return execFileAsync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], {
    windowsHide: true,
    timeout,
    maxBuffer: 1024 * 1024,
  });
}

function resolveUserPath(input = "") {
  const value = String(input).trim();
  const roots = [app.getPath("desktop"), app.getPath("documents"), app.getPath("downloads"), app.getPath("pictures"), app.getPath("music")];
  const resolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(app.getPath("desktop"), value || ".");
  if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error("File actions are limited to Desktop, Documents, Downloads, Pictures, and Music.");
  }
  return resolved;
}

async function runTool(name, args, context) {
  switch (name) {
    case "open_app": {
      const requested = String(args.appName || "").trim();
      const wanted = (aliases[requested.toLowerCase()] || requested).toLowerCase().replace(/[^a-z0-9]/g, "");
      const found = context.apps.find((entry) => {
        const installed = String(entry.Name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return installed === wanted || installed.includes(wanted) || wanted.includes(installed);
      });
      if (!found) return { success: false, message: `Couldn't find an installed application matching "${args.appName}".` };
      return launchApp(found);
    }
    case "close_app":
      return closeApp(String(args.appName || ""));
    case "list_running_apps": {
      const { stdout } = await runPowerShell("Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -ExpandProperty MainWindowTitle | Sort-Object -Unique | Out-String");
      return { success: true, message: stdout.trim() || "No visible desktop applications were found." };
    }
    case "list_installed_apps":
      return { success: true, message: context.apps.map((entry) => entry.Name).filter(Boolean).sort().slice(0, 100).join("\n") || "No installed applications were found." };
    case "create_folder": {
      const target = resolveUserPath(args.folderPath);
      await fs.mkdir(target, { recursive: true });
      return { success: true, message: `Created folder: ${target}` };
    }
    case "move_file":
    case "copy_file": {
      const source = resolveUserPath(args.sourcePath);
      const destination = resolveUserPath(args.destinationPath);
      if (name === "move_file") await fs.rename(source, destination);
      else {
        const stat = await fs.stat(source);
        if (stat.isDirectory()) await fs.cp(source, destination, { recursive: true, errorOnExist: true });
        else await fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
      }
      return { success: true, message: `${name === "move_file" ? "Moved" : "Copied"} ${source} to ${destination}.` };
    }
    case "delete_path": {
      const target = resolveUserPath(args.targetPath);
      const choice = await dialog.showMessageBox({
        type: "warning",
        buttons: ["Cancel", "Delete permanently"],
        defaultId: 0,
        cancelId: 0,
        title: "Confirm permanent deletion",
        message: `Delete ${target}?`,
        detail: "This cannot be undone.",
      });
      if (choice.response !== 1) return { success: false, message: "Deletion cancelled." };
      await fs.rm(target, { recursive: true, force: false });
      return { success: true, message: `Deleted ${target}.` };
    }
    case "list_dir": {
      const target = resolveUserPath(args.folderPath || ".");
      const entries = await fs.readdir(target, { withFileTypes: true });
      return { success: true, message: entries.map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`).join("\n") || "This folder is empty." };
    }
    case "open_url": {
      const url = new URL(String(args.url || ""));
      if (!(["https:", "http:"].includes(url.protocol))) throw new Error("Only HTTP and HTTPS links are supported.");
      await shell.openExternal(url.toString());
      return { success: true, message: `Opened ${url.toString()}.` };
    }
    case "search_youtube":
      await shell.openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(String(args.query || ""))}`);
      return { success: true, message: `Opened YouTube results for "${args.query}".` };
    case "search_google":
      await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(String(args.query || ""))}`);
      return { success: true, message: `Opened Google results for "${args.query}".` };
    case "type_text": {
      if (typeof args.text !== "string" || args.text.length > 4000) throw new Error("Text must be under 4,000 characters.");
      const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${args.text.replace(/'/g, "''").replace(/[+^%~(){}\[\]]/g, "{$&}")}')`;
      await runPowerShell(script);
      return { success: true, message: "Typed the requested text into the active window." };
    }
    case "press_keys": {
      const keyAliases = { ENTER: "{ENTER}", TAB: "{TAB}", ESC: "{ESC}", ESCAPE: "{ESC}", SPACE: " ", UP: "{UP}", DOWN: "{DOWN}", LEFT: "{LEFT}", RIGHT: "{RIGHT}", DELETE: "{DELETE}", BACKSPACE: "{BACKSPACE}", HOME: "{HOME}", END: "{END}", CTRL: "^", ALT: "%", SHIFT: "+", WIN: "#" };
      const keys = String(args.keys || "").toUpperCase().split("+").map((key) => keyAliases[key] ?? (key.length === 1 ? key : `{${key}}`)).join("");
      if (!keys || /[^A-Z0-9{}+^%~()\[\] ]/.test(keys)) throw new Error("That key combination is not supported.");
      await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys.replace(/'/g, "''")}')`);
      return { success: true, message: `Pressed ${args.keys}.` };
    }
    case "set_window_layout": {
      const layouts = { left: "#{LEFT}", right: "#{RIGHT}", maximize: "#{UP}", restore: "#{DOWN}" };
      const key = layouts[String(args.layout || "").toLowerCase()];
      if (!key) throw new Error("Choose left, right, maximize, or restore.");
      await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${key}')`);
      return { success: true, message: `Applied the ${args.layout} window layout.` };
    }
    case "take_screenshot": {
      const target = path.join(app.getPath("desktop"), `Bumblebee_Screenshot_${new Date().toISOString().replace(/[:.]/g, "-")}.png`);
      const script = `Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $i=New-Object System.Drawing.Bitmap($b.Width,$b.Height); $g=[System.Drawing.Graphics]::FromImage($i); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $i.Save('${target.replace(/'/g, "''")}',[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $i.Dispose()`;
      await runPowerShell(script);
      return { success: true, message: `Saved a desktop screenshot to ${target}.` };
    }
    case "get_system_info":
      return { success: true, message: `${os.type()} ${os.release()} (${os.arch()})\nComputer: ${os.hostname()}\nMemory: ${Math.round(os.totalmem() / 1024 ** 3)} GB\nUser: ${os.userInfo().username}` };
    case "run_powershell": {
      const command = String(args.command || "").trim();
      if (!command || command.length > 2000) throw new Error("PowerShell commands must be between 1 and 2,000 characters.");
      const choice = await dialog.showMessageBox({
        type: "warning",
        buttons: ["Cancel", "Run command"],
        defaultId: 0,
        cancelId: 0,
        title: "Approve PowerShell command",
        message: "Bumblebee is asking to run this PowerShell command:",
        detail: command,
      });
      if (choice.response !== 1) return { success: false, message: "PowerShell command cancelled." };
      const { stdout, stderr } = await runPowerShell(command, 30000);
      return { success: true, message: (stdout || stderr || "PowerShell completed successfully.").trim().slice(0, 1800) };
    }
    case "play_spotify":
      await shell.openExternal(`https://open.spotify.com/search/${encodeURIComponent(String(args.query || ""))}`);
      return { success: true, message: `Opened Spotify results for "${args.query}". Choose a track to start playback.` };
    case "media_play_pause":
    case "media_next":
    case "media_previous":
    case "volume_mute": {
      const key = { media_play_pause: 0xB3, media_next: 0xB0, media_previous: 0xB1, volume_mute: 0xAD }[name];
      const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class UltronMediaKey { [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra); }'; [UltronMediaKey]::keybd_event(${key},0,0,[UIntPtr]::Zero); [UltronMediaKey]::keybd_event(${key},0,2,[UIntPtr]::Zero)`;
      await runPowerShell(script);
      return { success: true, message: `${name.replaceAll("_", " ")} command sent.` };
    }
    case "volume_set": {
      const level = Number(args.level);
      if (!Number.isFinite(level) || level < 0 || level > 100) throw new Error("Choose a volume from 0 to 100.");
      const count = Math.round(level / 2);
      const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class UltronVolumeKey { [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra); }'; 1..50 | ForEach-Object { [UltronVolumeKey]::keybd_event(174,0,0,[UIntPtr]::Zero); [UltronVolumeKey]::keybd_event(174,0,2,[UIntPtr]::Zero) }; 1..${count} | ForEach-Object { [UltronVolumeKey]::keybd_event(175,0,0,[UIntPtr]::Zero); [UltronVolumeKey]::keybd_event(175,0,2,[UIntPtr]::Zero) }`;
      await runPowerShell(script);
      return { success: true, message: `Set approximate system volume to ${level}%.` };
    }
    case "write_notepad":
      return typeInNotepad(String(args.content || ""));
    case "draw_in_paint": {
      clipboard.writeText(String(args.description || ""));
      const paint = spawn("mspaint.exe", [], { detached: true, stdio: "ignore" });
      paint.unref();
      return { success: true, message: "Opened Paint and copied your drawing description to the clipboard. Paint does not expose a reliable text-to-drawing interface, so the canvas is ready for you to paste or sketch." };
    }
    case "set_alarm":
      return setClockAlarm(String(args.time || ""));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function shouldRotate(error) {
  const status = typeof error?.status === "number" ? error.status : 0;
  const message = String(error?.message || error);
  return (status === 400 && /model.*(?:unavailable|unsupported|not found)/i.test(message)) ||
    status === 404 || status === 429 || status >= 500 ||
    /quota|rate.?limit|resource.?exhausted|overloaded|not found|model.*(?:unavailable|unsupported|not found)/i.test(String(error?.message || error));
}

function isFunctionTurnError(error) {
  return /function response turn comes immediately after a function call turn/i.test(
    String(error?.message || error)
  );
}

async function recoverFunctionTurnError(genAI, toolResults, startIndex) {
  const resultsText = JSON.stringify(toolResults);
  const prompt = [
    "Report the results of the completed desktop actions accurately and concisely.",
    "Do not claim an action succeeded unless its result says success: true.",
    `Action results: ${resultsText}`,
  ].join("\n\n");

  for (let offset = 0; offset < MODELS.length; offset++) {
    const modelName = MODELS[(startIndex + offset) % MODELS.length];
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const reply = result.response.text();
      if (!reply.trim()) throw new Error("Gemini returned an empty summary for completed actions.");
      return { reply, model: modelName };
    } catch (error) {
      console.warn(`Gemini could not summarize completed actions using ${modelName}:`, error);
    }
  }

  const details = toolResults.map(({ name, result }) => {
    const message = result && typeof result === "object" && "message" in result
      ? String(result.message)
      : JSON.stringify(result);
    return `${name}: ${message}`;
  });
  return {
    reply: `Gemini rejected the tool-response turn. Completed action results:\n${details.join("\n")}`,
    model: MODELS[startIndex],
  };
}

async function processMessage(message, apps) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE" || apiKey === "your_google_ai_studio_api_key") {
    throw new Error("Add GEMINI_API_KEY to .env.local, then restart Bumblebee.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const tools = [{ functionDeclarations: declarations }];
  const attempted = [];
  let lastError;
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const modelName = MODELS[modelIndex];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools,
        systemInstruction: "You are Bumblebee, a Windows desktop agent. Understand Telugu, English, and code-mixed requests. Execute requested tasks using tools; never claim success unless a tool reports success. Chain tools in order when needed. Ask a concise follow-up only when required arguments are unclear. Reply in the user's language and briefly report each tool action.",
      });
      const contents = [
        ...compactHistory(history),
        { role: "user", parts: [{ text: message }] },
      ];
      let result = await model.generateContent({ contents });
      const completedToolResults = [];
      for (let round = 0; round < 8; round++) {
        const calls = result.response.functionCalls() || [];
        if (!calls.length) {
          const finalContent = result.response.candidates?.[0]?.content;
          if (finalContent) contents.push(finalContent);
          history = compactHistory(contents);
          return { reply: result.response.text(), tools: attempted, model: modelName };
        }
        const modelContent = result.response.candidates?.[0]?.content;
        if (modelContent) contents.push(modelContent);
        const responses = [];
        for (const call of calls) {
          attempted.push(call.name);
          try {
            const toolResult = await runTool(call.name, call.args || {}, { apps });
            completedToolResults.push({ name: call.name, result: toolResult });
            responses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
          } catch (error) {
            const toolResult = { success: false, message: error instanceof Error ? error.message : "Tool failed." };
            completedToolResults.push({ name: call.name, result: toolResult });
            responses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
          }
        }
        contents.push({ role: "user", parts: responses });
        try {
          result = await model.generateContent({ contents });
        } catch (error) {
          if (!isFunctionTurnError(error)) throw error;
          const recovered = await recoverFunctionTurnError(genAI, completedToolResults, modelIndex);
          modelIndex = MODELS.indexOf(recovered.model);
          history = compactHistory([...contents, { role: "model", parts: [{ text: recovered.reply }] }]);
          return { reply: recovered.reply, tools: attempted, model: recovered.model };
        }
      }
      const reply = "I reached the eight-step action limit. Tell me what to do next.";
      history = compactHistory([...contents, { role: "model", parts: [{ text: reply }] }]);
      return { reply, tools: attempted, model: modelName };
    } catch (error) {
      lastError = error;
      if (!shouldRotate(error) || attempted.length > 0 || attempt === MODELS.length - 1) break;
      modelIndex = (modelIndex + 1) % MODELS.length;
      console.warn(`Gemini model ${modelName} failed; switching to ${MODELS[modelIndex]}.`);
    }
  }
  throw new Error(`Gemini agent request failed: ${lastError instanceof Error ? lastError.message : "Check the API key and connection."}`);
}

function getActiveModel() {
  return MODELS[modelIndex];
}

function getAvailableModels() {
  return [...MODELS];
}

function setActiveModel(modelName) {
  const index = MODELS.indexOf(modelName);
  if (index === -1) throw new Error(`Unsupported Gemini model: ${modelName}`);
  modelIndex = index;
  return getActiveModel();
}

module.exports = { getActiveModel, getAvailableModels, processMessage, setActiveModel };