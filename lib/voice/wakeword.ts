export function detectWakeWord(text: string) {
  return /^\s*(?:(?:hey|hello)\s+)?bumblebee\b/i.test(text);
}

export function stripWakeWord(text: string) {
  return text.replace(/^\s*(?:(?:hey|hello)\s+)?bumblebee\b[\s,.:;!?-]*/i, "").trim();
}