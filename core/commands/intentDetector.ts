import { findApplication } from "./appRegistry";

export type IntentType =
  | "OPEN_APP"
  | "CLOSE_APP"
  | "SEARCH_WEB"
  | "UNKNOWN";

export interface IntentResult {
  intent: IntentType;
  app?: string;
}

export function detectIntent(text: string): IntentResult {

  const lower = text.toLowerCase();

  if (
    lower.startsWith("open ") ||
    lower.includes("launch ")
  ) {

    const app = findApplication(lower);

    if (app) {
      return {
        intent: "OPEN_APP",
        app: app.command,
      };
    }
  }

  if (
    lower.startsWith("close ") ||
    lower.includes("exit ")
  ) {

    const app = findApplication(lower);

    if (app) {
      return {
        intent: "CLOSE_APP",
        app: app.command,
      };
    }
  }

  if (
    lower.startsWith("search ")
  ) {
    return {
      intent: "SEARCH_WEB",
    };
  }

  return {
    intent: "UNKNOWN",
  };
}