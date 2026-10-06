"use client";

import { useState, KeyboardEvent } from "react";

interface Props {
  onSend: (message: string) => void;
  loading?: boolean;
}

export default function InputBox({
  onSend,
  loading = false,
}: Props) {
  const [message, setMessage] = useState("");

  const send = () => {
    const text = message.trim();

    if (!text || loading) return;

    onSend(text);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      send();
    }
  };

  return (
    <div className="flex items-center gap-3 border-t border-white/10 p-4 backdrop-blur-xl">

      <input
        value={message}
        disabled={loading}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Bumblebee anything..."
        className="
          flex-1
          rounded-xl
          border
          border-white/10
          bg-white/5
          px-4
          py-3
          text-white
          outline-none
          placeholder:text-gray-400
          focus:border-cyan-400
          transition
        "
      />

      <button
        disabled={loading}
        onClick={send}
        className="
          rounded-xl
          bg-cyan-500
          px-5
          py-3
          text-white
          font-medium
          hover:bg-cyan-400
          disabled:opacity-50
          transition
        "
      >
        {loading ? "..." : "Send"}
      </button>

    </div>
  );
}