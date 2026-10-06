import { APPS } from "@/core/commands/appRegistry";

export type DesktopCommand = {
  action: "open" | "close";
  app: string;
} | {
  action: "notepad:type";
  text: string;
} | {
  action: "alarm:set";
  time: string;
} | {
  action: "explorer:open";
  location: string;
} | {
  action: "folder:create";
  location: "desktop" | "documents" | "downloads";
  name: string;
} | {
  action: "calculator:compute";
  expression: string;
} | {
  action: "music:search";
  provider: "spotify" | "youtube";
  query: string;
};

function normalizeAppName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseDesktopCommand(text: string): DesktopCommand | null {
  const request = text.trim();
  const noteMatch = request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:(?:open|launch|start)\s+notepad(?:\s+(?:and\s+)?(?:add|open|create)\s+(?:a\s+)?new\s+tab)?\s+(?:and\s+)?(?:type|write|enter|add)\s+(.+)|(?:type|write|enter|add)\s+(.+?)\s+(?:in|into)\s+(?:the\s+)?notepad)[.!?]*$/i,
  );
  if (noteMatch) {
    return { action: "notepad:type", text: (noteMatch[1] ?? noteMatch[2]).trim() };
  }

  const alarmMatch = request.match(/^(?:please\s+)?(?:can you\s+)?(?:set|create)\s+(?:an?\s+)?alarm\s+(?:for|at)\s+(.+?)[.!?]*$/i);
  if (alarmMatch) {
    const requestedTime = alarmMatch[1].trim();
    const twelveHour = requestedTime.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (twelveHour) {
      const period = twelveHour[3].toLowerCase().startsWith("p") ? "pm" : "am";
      let hour = Number(twelveHour[1]) % 12;
      if (period === "pm") hour += 12;
      return {
        action: "alarm:set",
        time: `${String(hour).padStart(2, "0")}:${twelveHour[2] ?? "00"}`,
      };
    }

    const twentyFourHour = requestedTime.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHour) {
      return {
        action: "alarm:set",
        time: `${twentyFourHour[1].padStart(2, "0")}:${twentyFourHour[2]}`,
      };
    }

    return null;
  }

  const folderCreateMatch = request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:create|make)\s+(?:a\s+)?folder\s+(?:named?\s+)?(.+?)\s+in\s+(?:my\s+)?(downloads|documents|desktop)[.!?]*$/i,
  );
  if (folderCreateMatch) {
    return {
      action: "folder:create",
      name: folderCreateMatch[1].trim(),
      location: folderCreateMatch[2].toLowerCase() as "desktop" | "documents" | "downloads",
    };
  }

  const folderOpenMatch = request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:open|show)\s+(?:(?:file\s+)?explorer\s+(?:at|in|to)\s+)?(?:my\s+)?(desktop|documents|downloads|pictures|music)(?:\s+folder)?[.!?]*$/i,
  );
  if (folderOpenMatch) {
    return {
      action: "explorer:open",
      location: folderOpenMatch[1].toLowerCase() as "desktop" | "documents" | "downloads" | "pictures" | "music",
    };
  }

  const explicitPathMatch = request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:open|show)\s+(?:(?:file\s+)?explorer\s+(?:at|in|to)\s+|folder\s+)(.+?)[.!?]*$/i,
  );
  if (explicitPathMatch) {
    const location = explicitPathMatch[1].trim().replace(/^["']|["']$/g, "");
    if (/^(?:[a-z]:\\|\\\\)/i.test(location)) {
      return { action: "explorer:open", location };
    }
  }

  const musicSearchMatch = request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:search|find|play)\s+(.+?)\s+(?:on|in|using)\s+(spotify|youtube)[.!?]*$/i,
  ) ?? request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:search|find|play)\s+(?:spotify|youtube)\s+(?:for\s+)?(.+?)[.!?]*$/i,
  );
  if (musicSearchMatch) {
    const provider = (musicSearchMatch[2] ?? request.match(/spotify|youtube/i)?.[0])?.toLowerCase();
    if (provider === "spotify" || provider === "youtube") {
      return { action: "music:search", provider, query: musicSearchMatch[1].trim() };
    }
  }

  const calculationMatch = request.match(
    /^(?:please\s+)?(?:can you\s+)?(?:calculate|compute|what is|what's)\s+(.+?)[?!.]*$/i,
  );
  if (calculationMatch) {
    const expression = calculationMatch[1]
      .toLowerCase()
      .replace(/\b(multiplied by|times|multiply(?: by)?)\b/g, "*")
      .replace(/\b(divided by|divide(?: by)?)\b/g, "/")
      .replace(/\b(plus|added to)\b/g, "+")
      .replace(/\b(minus|subtract(?:ed)?)\b/g, "-")
      .trim();
    if (/^[\d\s.+*/()%\-]+$/.test(expression)) {
      return { action: "calculator:compute", expression };
    }
  }

  const match = request.match(/^(?:please\s+)?(?:can you\s+)?(open|launch|start|close|quit|exit)\s+(?:the\s+)?(.+?)[.!?]*$/i);
  if (!match) return null;

  const action = /^(close|quit|exit)$/i.test(match[1]) ? "close" : "open";
  const requestedApp = normalizeAppName(match[2]);
  const app = APPS.find((entry) =>
    entry.aliases.some((alias) => normalizeAppName(alias) === requestedApp),
  );

  if (!app) return null;

  if (action === "close") {
    return app.closeCommand ? { action, app: app.closeCommand } : null;
  }

  return { action, app: app.command };
}