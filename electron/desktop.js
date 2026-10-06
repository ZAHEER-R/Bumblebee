const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const appUrl = process.env.ULTRON_URL || "http://localhost:3000";
const parsedAppUrl = new URL(appUrl);
const nextCli = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const electronExecutable = require("electron");

let nextProcess;
let electronProcess;
let shuttingDown = false;

function isServerReady() {
  return new Promise((resolve) => {
    const request = http.get(appUrl, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });

    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => resolve(false));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer(timeoutMilliseconds = 120000) {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (nextProcess.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready (code ${nextProcess.exitCode}).`);
    }

    if (await isServerReady()) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Next.js did not become ready at ${appUrl} within ${timeoutMilliseconds / 1000} seconds.`);
}

function stopProcesses(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (electronProcess && electronProcess.exitCode === null) {
    electronProcess.kill();
  }
  if (nextProcess && nextProcess.exitCode === null) {
    nextProcess.kill();
  }

  process.exitCode = exitCode;
}

process.on("SIGINT", () => stopProcesses(0));
process.on("SIGTERM", () => stopProcesses(0));

async function startDesktop() {
  if (!(await isServerReady())) {
    const port = parsedAppUrl.port || (parsedAppUrl.protocol === "https:" ? "443" : "3000");
    nextProcess = spawn(process.execPath, [nextCli, "dev", "--hostname", parsedAppUrl.hostname, "--port", port], {
      cwd: path.join(__dirname, ".."),
      env: process.env,
      stdio: "inherit",
    });

    nextProcess.on("error", (error) => {
      console.error("Unable to start Next.js:", error);
      stopProcesses(1);
    });

    nextProcess.on("exit", (code) => {
      if (!shuttingDown) {
        console.error(`Next.js exited unexpectedly (code ${code}).`);
        stopProcesses(code || 1);
      }
    });

    await waitForServer();
  } else {
    console.log(`Using the existing Bumblebee server at ${appUrl}.`);
  }

  if (shuttingDown) return;

  electronProcess = spawn(electronExecutable, [path.join(__dirname, "main.js")], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, ULTRON_URL: appUrl },
    stdio: "inherit",
  });

  electronProcess.on("error", (error) => {
    console.error("Unable to start Electron:", error);
    stopProcesses(1);
  });

  electronProcess.on("exit", (code) => stopProcesses(code || 0));
}

startDesktop().catch((error) => {
  console.error("Unable to start the Bumblebee desktop app:", error.message);
  stopProcesses(1);
});
