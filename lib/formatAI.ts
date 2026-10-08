export function formatAIResponse(text: string) {
  return text
    .replace(/```[\w-]*\s*([\s\S]*?)```/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi, "$1 at $2")
    .replace(/@([A-Z0-9_]+)/gi, "$1")
    .replace(/[*_~`#]/g, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
