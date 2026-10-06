const { execFile } = require("child_process");

function runPowerShell(script) {
    return new Promise((resolve) => {
        execFile(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script
            ],
            {
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 100
            },
            (error, stdout, stderr) => {
                if (error) {
                    console.error("PowerShell Error:", error.message);
                    if (stderr) console.error(stderr);
                    return resolve([]);
                }

                if (!stdout || !stdout.trim()) {
                    return resolve([]);
                }

                try {
                    let data = JSON.parse(stdout);
                    if (!Array.isArray(data)) data = [data];
                    resolve(data);
                } catch (e) {
                    console.error("JSON Parse Error");
                    console.error(stdout.substring(0, 1000));
                    resolve([]);
                }
            }
        );
    });
}

function normalizeName(name) {
    if (!name) return "";
    return name
        .replace(/\s+/g, " ")
        .replace(/[®™]/g, "")
        .trim();
}

function normalizePath(target) {
    if (!target) return "";

    target = target.replace(/^"+|"+$/g, "");

    if (target.includes(",")) {
        target = target.split(",")[0];
    }

    return target.trim();
}

function uniqueApps(apps) {
    const map = new Map();

    for (const app of apps) {
        if (!app.Name) continue;

        const key = app.Name.toLowerCase();

        if (!map.has(key)) {
            map.set(key, app);
        }
    }

    return [...map.values()];
}

async function getInstalledApps() {

    console.log("Scanning installed applications...");

    const script = `
$apps = @()

# ---------------- UWP / Microsoft Store ----------------
Get-StartApps | ForEach-Object {
    $apps += [PSCustomObject]@{
        Name   = $_.Name
        Type   = "uwp"
        Target = $_.AppID
    }
}

# ---------------- HKLM 64-bit ----------------
Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
Where-Object { $_.DisplayName -and $_.DisplayIcon } |
ForEach-Object {
    $apps += [PSCustomObject]@{
        Name   = $_.DisplayName
        Type   = "exe"
        Target = $_.DisplayIcon
    }
}

# ---------------- HKLM 32-bit ----------------
Get-ItemProperty HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
Where-Object { $_.DisplayName -and $_.DisplayIcon } |
ForEach-Object {
    $apps += [PSCustomObject]@{
        Name   = $_.DisplayName
        Type   = "exe"
        Target = $_.DisplayIcon
    }
}

# ---------------- HKCU ----------------
Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue |
Where-Object { $_.DisplayName -and $_.DisplayIcon } |
ForEach-Object {
    $apps += [PSCustomObject]@{
        Name   = $_.DisplayName
        Type   = "exe"
        Target = $_.DisplayIcon
    }
}

$apps | ConvertTo-Json -Depth 3 -Compress
`;

    let apps = await runPowerShell(script);

    apps = apps
        .map(app => ({
            Name: normalizeName(app.Name),
            Type: app.Type || "exe",
            Target: normalizePath(app.Target)
        }))
        .filter(app => app.Name && app.Target);

    apps = uniqueApps(apps);

    apps.sort((a, b) => a.Name.localeCompare(b.Name));

    console.log("--------------------------------");
    console.log("Installed Apps:", apps.length);
    console.log("--------------------------------");

    return apps;
}

module.exports = { getInstalledApps };