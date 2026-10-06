"use client";

import { useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export default function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello, I'm Bumblebee. How can I help you?",
    },
  ]);

  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply ?? "No response.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong.",
        },
      ]);
    }

    setLoading(false);
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        text: "Hello, I'm Bumblebee. How can I help you?",
      },
    ]);
  }

  return {
    messages,
    loading,
    sendMessage,
    clearChat,
  };
}