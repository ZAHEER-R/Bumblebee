import { setUltronStatus } from "@/lib/status/statusManager";
import { formatAIResponse } from "@/lib/formatAI";

let speaking = false;
let speechRequest = 0;

export type VoiceMode = "adam" | "eve";

const VOICE_NAMES: Record<VoiceMode, RegExp> = {
  adam: /\b(david|mark|guy|ryan|alex|daniel|james|male|adam)\b/i,
  eve: /\b(jenny|zira|aria|sonia|hazel|samantha|eva|female|eve)\b/i,
};

export function unlockSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.resume();
  }
}

export function speak(
  text: string,
  onEnd?: () => void,
  onError?: (message: string) => void,
  voiceMode: VoiceMode = "adam",
) {
  const cleanText = formatAIResponse(text);
  if (!cleanText || typeof window === "undefined") return;
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    console.error("Text-to-speech is not supported in this environment.");
    onError?.("Voice playback is not supported in this app environment.");
    setUltronStatus("READY");
    return;
  }

  const request = ++speechRequest;
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  speaking = false;

  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = synthesis.getVoices();
    const isTelugu = /[\u0C00-\u0C7F]/.test(cleanText);
    const preferredLanguage = isTelugu
      ? voices.filter((voice) => voice.lang.toLowerCase().startsWith("te"))
      : voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
    const languageVoices = preferredLanguage.length ? preferredLanguage : voices;
    const selectedVoice =
      languageVoices.find((voice) => VOICE_NAMES[voiceMode].test(voice.name)) ??
      voices.find((voice) => VOICE_NAMES[voiceMode].test(voice.name)) ??
      languageVoices[0];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang ?? (isTelugu ? "te-IN" : "en-US");
    utterance.rate = 0.95;
    utterance.pitch = voiceMode === "eve" ? 1.08 : 0.88;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (request !== speechRequest) return;
      speaking = true;
      setUltronStatus("SPEAKING");
    };
    utterance.onend = () => {
      if (request !== speechRequest) return;
      speaking = false;
      setUltronStatus("READY");
      onEnd?.();
    };
    utterance.onerror = (event) => {
      if (request !== speechRequest) return;
      speaking = false;
      setUltronStatus("READY");
      if (event.error !== "canceled" && event.error !== "interrupted") {
        console.error("Speech synthesis failed:", event.error);
        onError?.(`Bumblebee voice playback failed (${event.error}). Check your audio output and installed Windows speech voices.`);
        onEnd?.();
      }
    };

    synthesis.resume();
    synthesis.speak(utterance);
  } catch (error) {
    speaking = false;
    setUltronStatus("READY");
    console.error("Unable to start speech synthesis:", error);
    onError?.("Bumblebee could not start voice playback. Check your audio output and installed Windows speech voices.");
    onEnd?.();
  }
}

export function stopSpeaking() {
  speechRequest += 1;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  speaking = false;
}

export function isSpeaking() {
  return speaking;
}
