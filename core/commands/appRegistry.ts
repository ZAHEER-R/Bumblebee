export interface DesktopApp {
  aliases: string[];
  command: string;
  closeCommand?: string;
}

export const APPS: DesktopApp[] = [
  {
    aliases: ["chrome", "google chrome"],
    command: "chrome",
    closeCommand: "chrome",
  },
  {
    aliases: ["edge", "microsoft edge"],
    command: "msedge",
    closeCommand: "msedge",
  },
  {
    aliases: ["firefox"],
    command: "firefox",
    closeCommand: "firefox",
  },
  {
    aliases: ["vs code", "visual studio code", "code"],
    command: "vscode",
    closeCommand: "vscode",
  },
  {
    aliases: ["notepad"],
    command: "notepad",
    closeCommand: "notepad",
  },
  {
    aliases: ["calculator", "calc"],
    command: "calculator",
    closeCommand: "calculator",
  },
  {
    aliases: ["paint"],
    command: "mspaint",
    closeCommand: "mspaint",
  },
  {
    aliases: ["terminal", "windows terminal"],
    command: "terminal",
    closeCommand: "terminal",
  },
  {
    aliases: ["cmd", "command prompt"],
    command: "cmd",
    closeCommand: "cmd",
  },
  {
    aliases: ["file explorer", "explorer"],
    command: "explorer",
  },
  {
    aliases: ["clock", "windows clock", "alarms and clock"],
    command: "clock",
  },
];

export function findApplication(text: string) {
  const lower = text.toLowerCase();

  return APPS.find((app) =>
    app.aliases.some((alias) => lower.includes(alias)),
  );
}