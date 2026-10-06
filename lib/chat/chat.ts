import { ChatMessage } from "./types";

export function createUserMessage(text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content: text,
    timestamp: new Date(),
  };
}

export function createAssistantMessage(text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: text,
    timestamp: new Date(),
  };
}