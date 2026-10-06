"use client";

interface Props {
  role: "user" | "assistant";
  text: string;
}

export default function MessageBubble({ role, text }: Props) {
  const isUser = role === "user";

  return (
    <div
      className={`flex mb-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap break-words shadow-lg ${
          isUser
            ? "bg-cyan-500 text-white rounded-br-sm"
            : "bg-white/10 text-gray-100 rounded-bl-sm border border-white/10 backdrop-blur-md"
        }`}
      >
        {text}
      </div>
    </div>
  );
}